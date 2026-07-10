#!/usr/bin/env bash
# Provision an isolated workshop user on the coursework droplet. Run as root.
# Idempotent: safe to re-run (preserves an existing token + workspace).
#
#   sudo ./provision-user.sh zachary  8081 7691 --copy-auth-from coder
#   sudo ./provision-user.sh jonathan 8082 7692 --copy-auth-from coder
#
# Does, for <user>:
#   1. create the unix user + home (if absent)
#   2. seed ~/app (the viewer's docroot) with a placeholder page
#   3. write /etc/coursework/<user>.env with a UNIQUE bridge token + ports
#   4. seed ~/.claude auth (copy from another user, OR leave empty for own login)
#   5. enable+start coursework-bridge@<user> and coursework-app@<user>
#   6. register the user in /opt/coursework/routes.json and reload the proxy
# Then prints the token to paste into the CF Pages secret TERMINAL_TOKEN_<USER>.
set -euo pipefail

USER_NAME="${1:?usage: provision-user.sh <user> <appPort> <bridgePort> [--copy-auth-from <srcuser>]}"
APP_PORT="${2:?appPort required}"
BRIDGE_PORT="${3:?bridgePort required}"
COPY_AUTH_FROM=""
if [[ "${4:-}" == "--copy-auth-from" ]]; then COPY_AUTH_FROM="${5:?src user required after --copy-auth-from}"; fi

SHARED=/opt/coursework
ENVDIR=/etc/coursework

[[ $EUID -eq 0 ]] || { echo "must run as root" >&2; exit 1; }
[[ -f "$SHARED/bridge/server.mjs" ]] || { echo "missing $SHARED/bridge — run the one-time install (see workshop/README.md) first" >&2; exit 1; }

# 1. user + home
if ! id -u "$USER_NAME" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$USER_NAME"
  echo "[+] created unix user $USER_NAME"
else
  echo "[=] unix user $USER_NAME already exists"
fi
HOME_DIR="$(getent passwd "$USER_NAME" | cut -d: -f6)"

# 2. workspace (viewer docroot)
install -d -o "$USER_NAME" -g "$USER_NAME" "$HOME_DIR/app"
if [[ ! -e "$HOME_DIR/app/index.html" ]]; then
  cat >"$HOME_DIR/app/index.html" <<'HTML'
<!doctype html><meta charset="utf-8"><title>Your workshop</title>
<body style="font:16px/1.6 system-ui,sans-serif;margin:3rem;color:#111;background:#fafafa">
<h1 style="color:#1a3a5c">Your workshop is live</h1>
<p>Build something here — whatever you make will appear in this pane as you work.</p>
</body>
HTML
  chown "$USER_NAME:$USER_NAME" "$HOME_DIR/app/index.html"
  echo "[+] seeded $HOME_DIR/app/index.html"
fi

# 3. env file. Signed-token model (Phase I): the bridge authenticates with the SHARED
# WORKSHOP_SIGNING_SECRET (in /etc/coursework/signing.env, loaded by the service) + this
# user's WORKSHOP_USER claim — so there is NO per-user token to generate or store here.
mkdir -p "$ENVDIR"
ENV_FILE="$ENVDIR/$USER_NAME.env"
cat >"$ENV_FILE" <<EOF
PORT=$BRIDGE_PORT
APP_PORT=$APP_PORT
WORKSHOP_USER=$USER_NAME
WORKSPACE_DIR=$HOME_DIR/app
TMUX_SESSION=course
EOF
chmod 600 "$ENV_FILE"
chown root:root "$ENV_FILE"
if [[ ! -f "$ENVDIR/signing.env" ]]; then
  echo "[!] $ENVDIR/signing.env is MISSING — create it once (root, chmod 600):"
  echo "    printf 'WORKSHOP_SIGNING_SECRET=%s\\n' \"\$(openssl rand -hex 32)\" > $ENVDIR/signing.env && chmod 600 $ENVDIR/signing.env"
  echo "    then set the SAME value as the app secret: npx wrangler pages secret put WORKSHOP_SIGNING_SECRET"
fi

# 4. Claude auth
if [[ -n "$COPY_AUTH_FROM" ]]; then
  SRC_HOME="$(getent passwd "$COPY_AUTH_FROM" | cut -d: -f6)"
  if [[ -d "$SRC_HOME/.claude" ]]; then
    rm -rf "$HOME_DIR/.claude"
    cp -a "$SRC_HOME/.claude" "$HOME_DIR/.claude"
    [[ -f "$SRC_HOME/.claude.json" ]] && cp -a "$SRC_HOME/.claude.json" "$HOME_DIR/.claude.json"
    chown -R "$USER_NAME:$USER_NAME" "$HOME_DIR/.claude" 2>/dev/null || true
    chown "$USER_NAME:$USER_NAME" "$HOME_DIR/.claude.json" 2>/dev/null || true
    echo "[+] copied Claude auth from $COPY_AUTH_FROM  (SHARED credential — swap $USER_NAME to their own login/key later for true credential isolation)"
  else
    echo "[!] $SRC_HOME/.claude not found — skipped; $USER_NAME must run 'claude' and log in on first use"
  fi
else
  echo "[i] no --copy-auth-from: auth comes from the shared CLAUDE_CODE_OAUTH_TOKEN env"
  echo "    (/etc/coursework/claude-oauth.env, loaded by coursework-bridge@$USER_NAME) — no per-user login."
fi

# 5. services
systemctl enable --now "coursework-bridge@$USER_NAME" "coursework-app@$USER_NAME"
echo "[+] started coursework-bridge@$USER_NAME (bridge :$BRIDGE_PORT) + coursework-app@$USER_NAME (viewer :$APP_PORT)"

# 6. routing table + proxy reload
ROUTES="$SHARED/routes.json"
[[ -f "$ROUTES" ]] || echo '{ "default": { "appPort": 8080, "bridgePort": 7681 } }' >"$ROUTES"
node - "$ROUTES" "$USER_NAME" "$APP_PORT" "$BRIDGE_PORT" <<'NODE'
const fs = require('fs')
const [, , file, user, ap, bp] = process.argv
let r = {}
try { r = JSON.parse(fs.readFileSync(file, 'utf8')) } catch {}
r[user] = { appPort: +ap, bridgePort: +bp }
fs.writeFileSync(file, JSON.stringify(r, null, 2) + '\n')
console.log(`[+] routes.json: ${user} -> app :${ap}, bridge :${bp}`)
NODE
systemctl reload coursework-proxy 2>/dev/null \
  && echo "[+] reloaded coursework-proxy" \
  || echo "[i] coursework-proxy not running yet — it will pick up routes.json on start"

echo
echo "==================== DONE: $USER_NAME ===================="
echo "  route  : /u/$USER_NAME/  (bridge :$BRIDGE_PORT, viewer :$APP_PORT)"
echo "  auth   : signed tokens (shared WORKSHOP_SIGNING_SECRET + WORKSHOP_USER=$USER_NAME)"
echo "  No per-user token or per-user app secret needed. Ensure ONCE (not per user):"
echo "    - droplet: /etc/coursework/signing.env holds WORKSHOP_SIGNING_SECRET"
echo "    - app:     npx wrangler pages secret put WORKSHOP_SIGNING_SECRET  (SAME value)"
echo "=========================================================="

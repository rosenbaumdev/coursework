// Signed, short-lived workshop access tokens (Phase I of the onboarding plan).
//
// One shared secret (WORKSHOP_SIGNING_SECRET) signs a { u:<user>, exp } payload;
// each per-user droplet bridge verifies the signature + that the `u` claim matches
// ITS OWN unix account + not expired. No per-user secrets; rotating the one secret
// invalidates every outstanding token at once. The OS account stays the real
// isolation boundary — the token only gates which bridge you may connect to.
//
// Format:  <payloadB64url>.<sigB64url>
//   payload = JSON { u: user, exp: <unix seconds> }
//   sig     = HMAC-SHA256(payloadB64url, secret)
//   base64url, no padding.
// This MUST stay byte-compatible with the Node verifier in workshop/bridge/server.mjs
// (proven by scripts against both crypto.subtle and node:crypto).

const enc = new TextEncoder()

function b64urlFromBytes(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const b64urlFromString = (str) => b64urlFromBytes(enc.encode(str))

export const WORKSHOP_TOKEN_TTL_SECONDS = 24 * 60 * 60 // 24h — ≥ the CF Access session so it won't lapse mid-session

// Mint a signed token for `user`. Returns '' if user/secret missing (caller falls
// back to the legacy shared token during cutover).
export async function signWorkshopToken(user, secret, ttlSeconds = WORKSHOP_TOKEN_TTL_SECONDS) {
  if (!user || !secret) return ''
  const payload = { u: user, exp: Math.floor(Date.now() / 1000) + ttlSeconds }
  const payloadB64 = b64urlFromString(JSON.stringify(payload))
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64))
  return `${payloadB64}.${b64urlFromBytes(new Uint8Array(sigBuf))}`
}

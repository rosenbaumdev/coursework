// vsh — a tiny virtual shell for the terminal canvas. In-browser only: a seeded
// virtual filesystem + a real-feeling command interpreter (paths, flags, redirects,
// proper error messages). No real execution, no persistence — a training sandbox.
// When the terminal goes real (PTY over SSH), this is replaced wholesale.

const HOME = '/home/coursework'
const USER = 'coursework'
const HOST = 'coursework'

function dir(children = {}) {
  return { type: 'dir', children }
}
function file(content = '') {
  return { type: 'file', content }
}

// Fresh filesystem each session (no persistence).
export function createFs() {
  return dir({
    home: dir({
      coursework: dir({
        'README.md': file(
          '# Coursework Sandbox\n\nThis is a simulated shell — a safe place to practice.\n\nTry:\n- `ls -a`   list files (incl. hidden)\n- `cat notes.txt`\n- `edit notes.txt`   open the editor\n- `echo "hi" > new.txt` then `cat new.txt`\n- `cd projects && ls`\n',
        ),
        'notes.txt': file('todo:\n- learn the shell\n- build something real\n'),
        projects: dir({
          'hello.js': file("console.log('hello from the sandbox')\n"),
          'ideas.md': file('# Ideas\n- an AI study buddy\n- a habit tracker\n'),
        }),
        '.env': file('SECRET=not-a-real-secret\n'),
      }),
    }),
  })
}

export function initialState() {
  return { root: createFs(), cwd: HOME, user: USER, host: HOST }
}

// --- path helpers ---
function normalize(cwd, input) {
  let p = input == null || input === '' ? cwd : input
  if (p === '~' || p.startsWith('~/')) p = HOME + p.slice(1)
  const base = p.startsWith('/') ? [] : cwd.split('/').filter(Boolean)
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') base.pop()
    else base.push(seg)
  }
  return '/' + base.join('/')
}
function segs(path) {
  return path.split('/').filter(Boolean)
}
function getNode(root, path) {
  let node = root
  for (const s of segs(path)) {
    if (node.type !== 'dir' || !node.children[s]) return null
    node = node.children[s]
  }
  return node
}
function getParent(root, path) {
  const parts = segs(path)
  const name = parts.pop()
  const parent = getNode(root, '/' + parts.join('/'))
  return { parent, name }
}
function tilde(path) {
  return path === HOME ? '~' : path.startsWith(HOME + '/') ? '~' + path.slice(HOME.length) : path
}

// --- tokenizer (light: whitespace split + basic quote stripping) ---
function tokenize(line) {
  const out = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m
  while ((m = re.exec(line))) out.push(m[1] ?? m[2] ?? m[3])
  return out
}

const HELP = [
  'Available commands:',
  '  ls [-a] [-l] [path]   list directory',
  '  cd [path]             change directory (no arg → home)',
  '  pwd                   print working directory',
  '  cat <file...>         print file contents',
  '  echo <text> [> file]  print text, or write/append (>>) to a file',
  '  mkdir <dir>           make a directory',
  '  touch <file>          create/refresh a file',
  '  mv <src> <dst>        move/rename',
  '  rm [-r] <path>        remove file (or dir with -r)',
  '  edit <file>           open the editor',
  '  head [-n N] <file>    first lines of a file',
  '  whoami / date / clear / help',
]

// Run one command line. Mutates `state` (cwd, fs). Returns
// { output:[{kind,text}], clear?:bool, edit?:{path,name} }.
export function run(state, line) {
  const raw = line.trim()
  if (!raw) return { output: [] }
  const toks = tokenize(raw)
  const cmd = toks[0]
  let args = toks.slice(1)

  // redirection: echo ... > file  /  >> file
  let redirect = null
  const gtgt = args.indexOf('>>')
  const gt = args.indexOf('>')
  const ri = gtgt !== -1 ? gtgt : gt
  if (ri !== -1) {
    redirect = { append: gtgt !== -1, path: args[ri + 1] }
    args = args.slice(0, ri)
  }

  const err = (text) => ({ output: [{ kind: 'err', text }] })
  const ok = (lines) => ({ output: (Array.isArray(lines) ? lines : [lines]).map((t) => ({ kind: 'out', text: t })) })
  const flags = args.filter((a) => a.startsWith('-')).join('')
  const rest = args.filter((a) => !a.startsWith('-'))

  switch (cmd) {
    case 'help':
      return ok(HELP)
    case 'pwd':
      return ok(state.cwd)
    case 'whoami':
      return ok(state.user)
    case 'date':
      return ok(new Date().toString())
    case 'clear':
      return { output: [], clear: true }
    case 'echo': {
      const text = rest.join(' ')
      if (redirect) {
        if (!redirect.path) return err('echo: syntax error near redirect')
        const abs = normalize(state.cwd, redirect.path)
        const { parent, name } = getParent(state.root, abs)
        if (!parent || parent.type !== 'dir') return err(`echo: ${redirect.path}: No such file or directory`)
        const existing = parent.children[name]
        if (existing && existing.type === 'dir') return err(`echo: ${redirect.path}: Is a directory`)
        const prev = redirect.append && existing ? existing.content : ''
        parent.children[name] = file(prev + text + '\n')
        return { output: [] }
      }
      return ok(text)
    }
    case 'ls': {
      const target = normalize(state.cwd, rest[0])
      const node = getNode(state.root, target)
      if (!node) return err(`ls: ${rest[0] || target}: No such file or directory`)
      if (node.type === 'file') return ok(rest[0] || target)
      let names = Object.keys(node.children)
      if (!flags.includes('a')) names = names.filter((n) => !n.startsWith('.'))
      names.sort()
      if (flags.includes('l')) {
        return ok(
          names.length
            ? names.map((n) => {
                const c = node.children[n]
                const tag = c.type === 'dir' ? 'd' : '-'
                const size = c.type === 'file' ? c.content.length : 0
                return `${tag}rw-r--r--  ${String(size).padStart(5)}  ${n}${c.type === 'dir' ? '/' : ''}`
              })
            : [''],
        )
      }
      return ok(names.length ? [names.map((n) => (node.children[n].type === 'dir' ? n + '/' : n)).join('   ')] : [''])
    }
    case 'cd': {
      const target = normalize(state.cwd, rest[0] || HOME)
      const node = getNode(state.root, target)
      if (!node) return err(`cd: no such file or directory: ${rest[0]}`)
      if (node.type !== 'dir') return err(`cd: not a directory: ${rest[0]}`)
      state.cwd = target
      return { output: [] }
    }
    case 'cat': {
      if (!rest.length) return err('cat: missing file operand')
      const out = []
      for (const f of rest) {
        const node = getNode(state.root, normalize(state.cwd, f))
        if (!node) out.push({ kind: 'err', text: `cat: ${f}: No such file or directory` })
        else if (node.type === 'dir') out.push({ kind: 'err', text: `cat: ${f}: Is a directory` })
        else node.content.replace(/\n$/, '').split('\n').forEach((l) => out.push({ kind: 'out', text: l }))
      }
      return { output: out }
    }
    case 'head': {
      let n = 10
      const ni = args.indexOf('-n')
      if (ni !== -1) n = parseInt(args[ni + 1], 10) || 10
      const f = rest[rest.length - 1]
      if (!f) return err('head: missing file operand')
      const node = getNode(state.root, normalize(state.cwd, f))
      if (!node || node.type !== 'file') return err(`head: ${f}: No such file or directory`)
      return ok(node.content.replace(/\n$/, '').split('\n').slice(0, n))
    }
    case 'mkdir': {
      if (!rest.length) return err('mkdir: missing operand')
      const { parent, name } = getParent(state.root, normalize(state.cwd, rest[0]))
      if (!parent || parent.type !== 'dir') return err(`mkdir: cannot create directory '${rest[0]}': No such file or directory`)
      if (parent.children[name]) return err(`mkdir: cannot create directory '${rest[0]}': File exists`)
      parent.children[name] = dir()
      return { output: [] }
    }
    case 'touch': {
      if (!rest.length) return err('touch: missing file operand')
      const { parent, name } = getParent(state.root, normalize(state.cwd, rest[0]))
      if (!parent || parent.type !== 'dir') return err(`touch: cannot touch '${rest[0]}': No such file or directory`)
      if (!parent.children[name]) parent.children[name] = file('')
      return { output: [] }
    }
    case 'rm': {
      if (!rest.length) return err('rm: missing operand')
      const abs = normalize(state.cwd, rest[0])
      const node = getNode(state.root, abs)
      if (!node) return err(`rm: ${rest[0]}: No such file or directory`)
      if (node.type === 'dir' && !flags.includes('r')) return err(`rm: ${rest[0]}: is a directory`)
      const { parent, name } = getParent(state.root, abs)
      delete parent.children[name]
      return { output: [] }
    }
    case 'mv': {
      if (rest.length < 2) return err('mv: missing destination file operand')
      const srcAbs = normalize(state.cwd, rest[0])
      const src = getNode(state.root, srcAbs)
      if (!src) return err(`mv: ${rest[0]}: No such file or directory`)
      const { parent: sp, name: sn } = getParent(state.root, srcAbs)
      let dstAbs = normalize(state.cwd, rest[1])
      const dstNode = getNode(state.root, dstAbs)
      let dp, dn
      if (dstNode && dstNode.type === 'dir') {
        dp = dstNode
        dn = sn
      } else {
        ;({ parent: dp, name: dn } = getParent(state.root, dstAbs))
      }
      if (!dp || dp.type !== 'dir') return err(`mv: ${rest[1]}: No such file or directory`)
      dp.children[dn] = src
      delete sp.children[sn]
      return { output: [] }
    }
    case 'edit':
    case 'nano':
    case 'vi':
    case 'vim': {
      if (!rest.length) return err(`${cmd}: missing file operand`)
      const abs = normalize(state.cwd, rest[0])
      const node = getNode(state.root, abs)
      if (node && node.type === 'dir') return err(`${cmd}: ${rest[0]}: Is a directory`)
      return { output: [], edit: { path: abs, name: rest[0] } }
    }
    default:
      return err(`${cmd}: command not found`)
  }
}

// Read/write a file for the editor (creating parents' entry as needed).
export function readFile(state, path) {
  const node = getNode(state.root, path)
  return node && node.type === 'file' ? node.content : ''
}
export function writeFile(state, path, content) {
  const { parent, name } = getParent(state.root, path)
  if (parent && parent.type === 'dir') parent.children[name] = file(content)
}

export function promptFor(state) {
  return `${state.user}@${state.host}:${tilde(state.cwd)}$`
}

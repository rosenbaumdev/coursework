import { useEffect, useRef, useState } from 'react'
import { initialState, run, promptFor, readFile, writeFile } from '../../../session/vsh.js'
import LiveTerminal from './LiveTerminal.jsx'

// Dispatcher: mode:'live' → real PTY over wss (droplet); otherwise the sandbox sim.
export default function TerminalCanvas({ payload, onLiveState }) {
  if (payload?.mode === 'live') return <LiveTerminalCanvas payload={payload} onLiveState={onLiveState} />
  return <SimTerminal payload={payload} onLiveState={onLiveState} />
}

// Live terminal: xterm.js in the chrome frame, wired to the droplet PTY bridge.
function LiveTerminalCanvas({ payload, onLiveState }) {
  const [status, setStatus] = useState('connecting')
  const dot = status === 'connected' ? 'bg-[#28c840]' : status === 'error' || status === 'closed' ? 'bg-[#ff5f57]' : 'bg-[#febc2e]'
  return (
    <div className="h-full p-3 sm:p-4">
      <div className="h-full flex flex-col rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#111] shadow-card">
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b border-[#2a2a2a]">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-[11px] text-[#9ca3af]">{payload.label || 'coursework-vm — bash'}</span>
          <span className={`ml-auto h-2 w-2 rounded-full ${dot}`} title={status} />
        </div>
        <div className="flex-1 min-h-0 p-2">
          <LiveTerminal url={payload.wsUrl} token={payload.token} onStatus={setStatus} onLiveState={onLiveState} />
        </div>
      </div>
    </div>
  )
}

// Interactive simulated shell over the vsh virtual filesystem. Real-feeling (paths,
// flags, redirects, history, an `edit` editor) but no real execution/persistence —
// a training sandbox.
function SimTerminal({ payload, onLiveState }) {
  const stRef = useRef(null)
  if (!stRef.current) stRef.current = initialState()
  const st = stRef.current

  const [lines, setLines] = useState([
    { kind: 'out', text: 'coursework sandbox — type `help` to start.' },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [editor, setEditor] = useState(null) // { path, name, content } | null
  const [tick, setTick] = useState(0) // force prompt refresh after cd

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const editorRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, editor])

  useEffect(() => {
    if (editor) editorRef.current?.focus()
    else inputRef.current?.focus()
  }, [editor])

  // Report live state so the chat knows the sandbox's cwd + recent output.
  useEffect(() => {
    if (!onLiveState) return
    const recent = lines
      .slice(-8)
      .map((l) => (l.kind === 'cmd' ? `${promptFor(st)} ${l.text}` : l.text))
      .join('\n')
    const editing = editor ? ` Currently editing ${editor.name}.` : ''
    onLiveState(`Working directory: ${st.cwd}.${editing} Recent output:\n${recent}`)
  }, [lines, editor, onLiveState, st])

  function submit() {
    const line = input
    const prompt = promptFor(st)
    setInput('')
    setHistIdx(-1)
    if (line.trim()) setHistory((h) => [...h, line])

    const res = run(st, line)
    setTick((t) => t + 1) // cwd may have changed

    if (res.clear) {
      setLines([])
      return
    }
    setLines((prev) => [
      ...prev,
      { kind: 'cmd', text: line, prompt },
      ...res.output,
    ])
    if (res.edit) {
      setEditor({ path: res.edit.path, name: res.edit.name, content: readFile(st, res.edit.path) })
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!history.length) return
      const i = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1)
      setHistIdx(i)
      setInput(history[i])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx === -1) return
      const i = histIdx + 1
      if (i >= history.length) {
        setHistIdx(-1)
        setInput('')
      } else {
        setHistIdx(i)
        setInput(history[i])
      }
    }
  }

  function saveEditor() {
    writeFile(st, editor.path, editor.content)
    setLines((prev) => [...prev, { kind: 'out', text: `saved ${editor.name}` }])
    setEditor(null)
  }
  function onEditorKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      saveEditor()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditor(null)
    }
  }

  const prompt = promptFor(st)
  void tick

  return (
    <div className="h-full p-3 sm:p-4">
      <div className="h-full flex flex-col rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#111] shadow-card">
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b border-[#2a2a2a]">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-[11px] text-[#9ca3af]">
            {editor ? `edit — ${editor.name}  ·  ⌘S save · Esc exit` : 'sandbox — bash'}
          </span>
        </div>

        {editor ? (
          <textarea
            ref={editorRef}
            value={editor.content}
            onChange={(e) => setEditor((ed) => ({ ...ed, content: e.target.value }))}
            onKeyDown={onEditorKeyDown}
            spellCheck={false}
            className="flex-1 min-h-0 resize-none bg-[#111] text-[#e5e7eb] font-mono text-[13px] leading-relaxed p-3 focus:outline-none"
          />
        ) : (
          <div
            ref={scrollRef}
            onClick={() => inputRef.current?.focus()}
            className="flex-1 min-h-0 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed cursor-text"
          >
            {lines.map((l, i) => (
              <div
                key={i}
                className={
                  l.kind === 'cmd' ? 'text-[#e5e7eb]' : l.kind === 'err' ? 'text-red-400' : 'text-[#9ca3af]'
                }
              >
                {l.kind === 'cmd' ? <span className="text-[#28c840] mr-2">{l.prompt}</span> : null}
                <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{l.text}</span>
              </div>
            ))}
            <div className="flex text-[#e5e7eb]">
              <span className="text-[#28c840] mr-2 shrink-0">{prompt}</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[#e5e7eb] font-mono text-[13px] p-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

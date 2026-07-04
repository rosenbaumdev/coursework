// POST /<studentSlug>/api/session/message
// Stateless, context-aware coached-session chat. The client sends the running
// conversation plus a description of what's on the canvas (and any region the
// learner marquee-selected); the server streams back a reply as SSE. No session
// store — the client owns the transcript for this prototype.
//
// Provider-abstracted: default is Anthropic Haiku; set SESSION_LLM_PROVIDER=ollama
// (+ OLLAMA_URL / OLLAMA_MODEL) to use a local llama/Gemma model in dev. (Edge→
// localhost only works under local `wrangler pages dev`, not on deployed CF.)
//
// Frames: { type:'delta', text } · { type:'done' } · { type:'error', message }

import { errorResponse } from '../../../_shared.js'
import { callAnthropicStream, consumeAnthropicSSE } from '../../../_interview.js'

const HAIKU = 'claude-haiku-4-5'
const enc = new TextEncoder()
const frame = (obj) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`)

const SYSTEM = `You are the coach inside a live "coached session." The learner works in a two-pane app: a chat with you on one side, and a content canvas on the other showing whatever the moment calls for — reading, a slide deck, a video, an image, a web browser, a terminal sandbox, or an editable artifact.

You can SEE what's on their canvas (it's given to you below as [CANVAS]). Talk about it naturally: answer questions about what they're looking at, point things out, react to what they select. Be concise, warm, and concrete — a good tutor, not a lecture. If they marquee-select a region it's given as [SELECTION]; treat it as "the thing they're pointing at."`

// Keep only user/assistant turns, drop leading assistant messages, merge consecutive
// same-role turns, and require the last turn to be from the user (Anthropic rules).
function sanitize(messages) {
  const arr = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }))
  while (arr.length && arr[0].role === 'assistant') arr.shift()
  const out = []
  for (const m of arr) {
    const last = out[out.length - 1]
    if (last && last.role === m.role) last.content += '\n\n' + m.content
    else out.push({ ...m })
  }
  if (!out.length || out[out.length - 1].role !== 'user') return null
  return out
}

function buildSystem(canvasContext, selection) {
  let s = SYSTEM
  s += `\n\n[CANVAS]\n${canvasContext || 'The canvas is empty.'}`
  if (selection && (selection.text || selection.note)) {
    s += `\n\n[SELECTION] The learner is pointing at this part of the canvas: ${selection.text || selection.note}`
  }
  return s
}

// Local Ollama chat, streamed (newline-delimited JSON). Yields text via onText.
async function streamOllama(env, { system, messages }, onText) {
  const url = (env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '')
  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL || 'llama3.2',
      stream: true,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line) continue
      try {
        const j = JSON.parse(line)
        if (j.message?.content) onText(j.message.content)
      } catch {
        /* partial line */
      }
    }
  }
}

export async function onRequestPost({ env, request }) {
  // The coached-session chat is generic (stateless, model-only) — it doesn't
  // require a known student, so it works on the bare `/session` route too.
  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const messages = sanitize(body?.messages)
  if (!messages) return errorResponse('No user message to respond to')
  const system = buildSystem(body?.canvasContext, body?.selection)
  const provider = env.SESSION_LLM_PROVIDER || 'anthropic'

  // Open the upstream BEFORE committing to a 200 SSE body so auth/credit errors
  // surface as a normal JSON error.
  let upstream = null
  if (provider === 'anthropic') {
    try {
      upstream = await callAnthropicStream(env, { model: HAIKU, system, messages, max_tokens: 800 })
    } catch (err) {
      return errorResponse(`Chat failed: ${err.message}`, 502)
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const onText = (t) => controller.enqueue(frame({ type: 'delta', text: t }))
        if (provider === 'ollama') {
          await streamOllama(env, { system, messages }, onText)
        } else {
          await consumeAnthropicSSE(upstream, (delta) => onText(delta))
        }
        controller.enqueue(frame({ type: 'done' }))
      } catch (err) {
        controller.enqueue(frame({ type: 'error', message: `Chat failed: ${err.message}` }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  })
}

import { useState } from 'react'

const TIME_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

function formatTimestamp(iso) {
  try {
    return TIME_FMT.format(new Date(iso)).replace(/\s?(AM|PM)/i, (m) => m.toLowerCase().trim())
  } catch {
    return iso
  }
}

function AuthorPill({ author }) {
  const isJordan = author === 'jordan'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white ${
        isJordan ? 'bg-accent' : 'bg-dad'
      }`}
    >
      {isJordan ? 'Jordan' : 'Dad'}
    </span>
  )
}

export default function NotesThread({ notes, isDAD, onAdd }) {
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text)
    setText('')
  }

  const author = isDAD ? 'dad' : 'jordan'
  const placeholder = isDAD
    ? 'Leave Jordan some feedback…'
    : 'What happened today? What got hard?'

  return (
    <div className="mt-4 rounded-md bg-inset border-l-2 border-rule px-4 py-3">
      {notes.length === 0 ? (
        <p className="text-sm text-muted italic mb-3">No notes yet.</p>
      ) : (
        <ul className="space-y-3 mb-4">
          {notes.map((note) => (
            <li key={note.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <AuthorPill author={note.author} />
                <span className="font-mono text-[11px] text-muted">
                  {formatTimestamp(note.timestamp)}
                </span>
              </div>
              <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                {note.text}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-y rounded-md border border-rule bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e)
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Posting as {author}
          </span>
          <button
            type="submit"
            disabled={!text.trim()}
            className={`rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${
              text.trim()
                ? isDAD
                  ? 'bg-dad text-white hover:bg-dad/90'
                  : 'bg-accent text-white hover:bg-accent/90'
                : 'bg-rule text-muted cursor-not-allowed'
            }`}
          >
            Add Note
          </button>
        </div>
      </form>
    </div>
  )
}

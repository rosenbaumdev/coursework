// Reading-material markdown map: headers render as muted mono section labels
// (not conversational emphasis). Used by the day-card rich body and by the
// coached-session ReadingCanvas so long-form course content looks consistent.
export const MD_COMPONENTS = {
  h1: ({ children }) => <h4 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted mt-5 mb-2">{children}</h4>,
  h2: ({ children }) => <h4 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted mt-5 mb-2">{children}</h4>,
  h3: ({ children }) => <h4 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted mt-5 mb-2">{children}</h4>,
  h4: ({ children }) => <h4 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted mt-5 mb-2">{children}</h4>,
  p: ({ children }) => <p className="text-sm text-ink leading-relaxed mb-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-sm text-ink">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-sm text-ink">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/40 pl-3 my-3 text-sm text-muted italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="font-mono text-[12px] bg-inset px-1 py-0.5 rounded border border-rule">{children}</code>
    ) : (
      <code className="font-mono text-[12px]">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="bg-inset border border-rule rounded-md p-3 overflow-x-auto text-[12px] mb-3">{children}</pre>
  ),
  hr: () => <hr className="my-4 border-rule" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="text-left font-semibold border-b border-rule px-2 py-1.5">{children}</th>,
  td: ({ children }) => <td className="border-b border-rule px-2 py-1.5 align-top">{children}</td>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2 hover:no-underline">
      {children}
    </a>
  ),
  input: ({ checked, type }) =>
    type === 'checkbox' ? (
      <input type="checkbox" checked={checked} readOnly className="mr-1.5 accent-accent" />
    ) : null,
}

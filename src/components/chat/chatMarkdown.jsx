// Chat-tuned markdown map: tighter than the day-card renderer, sized for bubbles.
// Headers read as conversational emphasis (a greeting "# Hey Zachary"), not the
// muted mono section labels used elsewhere. Shared by the interview view and the
// coached-session chat pane so both render assistant turns identically.
export const CHAT_MD = {
  h1: ({ children }) => <p className="text-[15px] font-semibold text-ink mb-2">{children}</p>,
  h2: ({ children }) => <p className="text-[15px] font-semibold text-ink mb-2">{children}</p>,
  h3: ({ children }) => <p className="text-[15px] font-semibold text-ink mb-2">{children}</p>,
  h4: ({ children }) => <p className="text-[15px] font-semibold text-ink mb-2">{children}</p>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/40 pl-3 my-2 text-muted italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="font-mono text-[12px] bg-white/60 px-1 py-0.5 rounded border border-rule">
        {children}
      </code>
    ) : (
      <code className="font-mono text-[12px]">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="bg-white border border-rule rounded-md p-3 overflow-x-auto text-[12px] my-2">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-[13px]">{children}</table>
    </div>
  ),
  hr: () => <hr className="my-3 border-rule" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
      {children}
    </a>
  ),
}

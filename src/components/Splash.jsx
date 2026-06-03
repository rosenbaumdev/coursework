export default function Splash() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted mb-2">
          Builder Coursework
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mb-3">
          You need a direct course URL
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          This is a private course tracker. Ask your coursemaster for the URL of
          your course — it'll look like <code className="font-mono text-ink">/yourname</code>.
        </p>
      </div>
    </main>
  )
}

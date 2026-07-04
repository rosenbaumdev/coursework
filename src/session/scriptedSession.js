// Generic showcase session for the v1 UX prototype. A scripted walk whose only
// job is to prove the two-pane modality: each turn advances the chat AND drives
// the content canvas to a different renderer, so stepping through it exercises
// every canvas type (reading → deck → video → terminal → browser → image →
// artifact → artifact-update) plus the "canvas updates live" moment.
//
// This is data, not logic. Swapping it (or the driver that reads it) for the real
// engine's SSE stream + a [SHOW:] parser is the whole point of the seam — see
// src/session/types.js.

// A static page for the mock browser — rendered via iframe srcDoc, no network.
const SAMPLE_PAGE = `<!doctype html><html><head><meta charset="utf-8">
<style>
  body{font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0;padding:28px;background:#fff}
  h1{font-size:22px;margin:0 0 8px} p{color:#374151;max-width:52ch}
  .pill{display:inline-block;background:#e6edf3;color:#1a3a5c;font:12px/1 monospace;
    padding:6px 10px;border-radius:999px;margin-top:14px}
</style></head><body>
  <h1>example.com</h1>
  <p>This is a fully self-contained page rendered inside the mock browser via
  <code>iframe srcDoc</code> — no network request leaves the app. In v2 this same
  pane can become a live proxied browser.</p>
  <span class="pill">mock &middot; srcdoc</span>
</body></html>`

export const SHOWCASE_SESSION = {
  title: 'Coached Session — Demo',
  turns: [
    {
      focus: 'Warm-up',
      assistant:
        "# Welcome to the session\nThis is a **coached session** — the chat on one side, an adaptive canvas on the other. As we go, the canvas will keep pace with the conversation. Right now it's showing your reading for this moment.\n\nWhen you're ready, tell me you're good and we'll keep moving.",
      chips: ["I'm ready", 'Tell me more first'],
      canvas: {
        type: 'reading',
        id: 'read-intro',
        title: 'How this works',
        payload: {
          markdown:
            "## The two-pane idea\nThe **left/bottom** pane is the coached chat. The **right/top** pane is a canvas the session drives.\n\nThe canvas isn't just artifacts — it's whatever the moment calls for:\n\n- reading material (like this)\n- slide decks\n- video\n- a terminal\n- a browser\n- images\n- live artifacts you build together\n\nAdvance the chat and watch it change.",
        },
      },
      tick: 1,
    },
    {
      focus: 'Concept',
      assistant:
        "Good. Here's a short deck laying out the core concept. Page through it on the canvas — use the arrows or the dots.",
      chips: ['Got it', 'Next concept'],
      canvas: {
        type: 'deck',
        id: 'deck-core',
        title: 'Core concept',
        payload: {
          frames: [
            { kind: 'markdown', markdown: '## 1 · Own the loop\nWhen the session runs **inside** the app, we control the lesson, observe every turn, and confirm objectives are actually met.', caption: '1 / 3' },
            { kind: 'markdown', markdown: '## 2 · One canvas, many surfaces\nThe same pane shows reading, decks, video, a terminal, a browser, images, or a live artifact — chosen per moment.', caption: '2 / 3' },
            { kind: 'image', src: '/session-assets/sample-image.jpg', markdown: '', caption: '3 / 3 · an image frame' },
          ],
        },
      },
      tick: 1,
    },
    {
      focus: 'Watch',
      assistant:
        'Some moments call for video — a demo, a technique, a walkthrough. The canvas now holds a player (a placeholder here).',
      chips: ['Played it', 'Skip ahead'],
      canvas: {
        type: 'video',
        id: 'video-demo',
        title: 'Walkthrough clip',
        payload: {
          src: '/session-assets/sample-video.mp4',
          poster: '/session-assets/sample-video-poster.jpg',
          label: 'Sample clip (moving test pattern + tone)',
          durationLabel: '0:06',
        },
      },
      tick: 1,
    },
    {
      focus: 'Do',
      assistant:
        "Now a hands-on moment. The canvas is a terminal — in this demo it replays scripted output, but the same slot can later be a **real** terminal wired to a live machine.",
      chips: ['Neat', 'Run it again'],
      canvas: {
        type: 'terminal',
        id: 'term-1',
        title: 'workspace — bash',
        payload: {
          mode: 'mock',
          prompt: '$',
          lines: [
            { kind: 'cmd', text: 'npm run build' },
            { kind: 'out', text: 'vite v5.4.8 building for production...' },
            { kind: 'out', text: '✓ 42 modules transformed.' },
            { kind: 'out', text: 'dist/index.html   0.61 kB' },
            { kind: 'out', text: '✓ built in 1.20s' },
            { kind: 'cmd', text: 'echo done' },
            { kind: 'out', text: 'done' },
          ],
        },
      },
      tick: 1,
    },
    {
      focus: 'Reference',
      assistant:
        'Need to look something up? The canvas can hold a browser. Here it renders a self-contained page (no network) — in v2 it can be a live, proxied view.',
      chips: ['Makes sense', 'Keep going'],
      canvas: {
        type: 'browser',
        id: 'browser-1',
        title: 'Reference',
        payload: { mode: 'mock', url: 'https://example.com', html: SAMPLE_PAGE },
      },
      tick: 1,
    },
    {
      focus: 'Look',
      assistant:
        'Plain images work too — diagrams, screenshots, plating shots for a cooking session. The canvas just contains and captions them.',
      chips: ['Nice', 'Next'],
      canvas: {
        type: 'image',
        id: 'image-1',
        title: 'A sample image',
        payload: {
          src: '/session-assets/sample-image.jpg',
          alt: 'Sample raster image',
          caption: 'A real image asset (800×500), contained and captioned.',
        },
      },
      tick: 1,
    },
    {
      focus: 'Build',
      assistant:
        "Finally, a **live artifact** — something built with you in the session. Here's a first draft on the canvas.",
      chips: ['Looks good', 'Refine it'],
      canvas: {
        type: 'artifact',
        id: 'artifact-plan',
        title: 'Session plan (draft)',
        payload: {
          format: 'markdown',
          title: 'Session plan',
          content: '# Session plan (draft)\n\n1. Warm up\n2. Learn the core concept\n3. Do a hands-on step\n\n_Draft — we can refine this together._',
        },
      },
      tick: 1,
    },
    {
      focus: 'Build',
      assistant:
        "Watch the artifact update in place — same panel, new content. That's the 'live' part: the canvas isn't static, the session keeps shaping it.",
      chips: ['Ship it', "That's the demo"],
      canvas: {
        type: 'artifact',
        id: 'artifact-plan',
        title: 'Session plan (v2)',
        payload: {
          format: 'markdown',
          title: 'Session plan',
          content: '# Session plan (v2)\n\n1. Warm up ✅\n2. Learn the core concept ✅\n3. Do a hands-on step ✅\n4. **Ship a real artifact** ← added live\n\n_Updated in place — no new panel._',
        },
      },
      tick: 1,
    },
    {
      focus: 'Done',
      assistant:
        "That's the whole modality: one coached chat, one adaptive canvas, every surface a session might need. Thanks for walking it.",
      chips: [],
      canvas: null,
      tick: 0,
    },
  ],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        paper: '#fafafa',
        accent: '#1a3a5c',
        'accent-soft': '#e6edf3',
        dad: '#64748b',
        rule: '#e5e7eb',
        inset: '#f8fafc',
        muted: '#6b7280',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', '"Space Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 17, 17, 0.04)',
        'card-hover': '0 4px 14px rgba(17, 17, 17, 0.08)',
        'card-current': '0 6px 20px rgba(26, 58, 92, 0.12)',
      },
    },
  },
  plugins: [],
}

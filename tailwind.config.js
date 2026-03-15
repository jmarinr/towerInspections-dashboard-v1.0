/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        navy:   { DEFAULT: '#0d2137', 2: '#122840', 3: '#1a3450' },
        teal:   { DEFAULT: '#00b4a0', dim: '#0d7a6d', light: '#e6faf8' },
        // status colors kept for checklist/score badges
        good:   { DEFAULT: '#22C55E', light: '#f0fdf4', ring: '#bbf7d0' },
        warn:   { DEFAULT: '#f59e0b', light: '#fffbeb', ring: '#fde68a' },
        bad:    { DEFAULT: '#ef4444', light: '#fef2f2', ring: '#fecaca' },
        na:     { DEFAULT: '#94A3B8', light: '#f1f5f9' },
        info:   { DEFAULT: '#3b82f6', light: '#eff6ff' },
      },
      boxShadow: {
        card:     '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        elevated: '0 4px 16px rgba(0,0,0,0.08)',
        'ring-teal': '0 0 0 3px rgba(0,180,160,0.2)',
        'ring-good': '0 0 0 3px rgba(34,197,94,0.2)',
        'ring-warn': '0 0 0 3px rgba(245,158,11,0.2)',
        'ring-bad':  '0 0 0 3px rgba(239,68,68,0.2)',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in': 'slideIn 0.22s cubic-bezier(0.22,1,0.36,1)',
        'score-pop':'scorePop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 },                          to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn:  { from: { transform: 'translateX(-100%)' },      to: { transform: 'translateX(0)' } },
        scorePop: { '0%':  { transform: 'scale(0.8)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0F172A', light: '#1E293B' },
        accent: { DEFAULT: '#6366F1', light: '#EEF2FF', dark: '#4F46E5' },
        surface: { DEFAULT: '#F8FAFC', card: '#FFFFFF' },
        good: { DEFAULT: '#22C55E', light: '#F0FDF4', ring: '#BBF7D0' },
        warn: { DEFAULT: '#F59E0B', light: '#FFFBEB', ring: '#FDE68A' },
        bad: { DEFAULT: '#EF4444', light: '#FEF2F2', ring: '#FECACA' },
        na: { DEFAULT: '#94A3B8', light: '#F1F5F9' },
        info: { DEFAULT: '#3B82F6', light: '#EFF6FF' },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'elevated': '0 4px 16px rgba(0,0,0,0.08)',
        'ring-good': '0 0 0 3px rgba(34,197,94,0.2)',
        'ring-warn': '0 0 0 3px rgba(245,158,11,0.2)',
        'ring-bad': '0 0 0 3px rgba(239,68,68,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'score-pop': 'scorePop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        scorePop: { '0%': { transform: 'scale(0.8)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0F2A4A', light: '#1E3A5F' },
        accent: { DEFAULT: '#FF934F', light: '#FFE8DB' },
        sidebar: { DEFAULT: '#111827' },
        brand: { DEFAULT: '#10B981', light: '#D1FAE5', dark: '#059669' },
        success: { DEFAULT: '#22C55E', light: '#DCFCE7' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7' },
        danger: { DEFAULT: '#EF4444', light: '#FEE2E2' },
        surface: { DEFAULT: '#F9FAFB', card: '#FFFFFF' },
      },
      boxShadow: {
        soft: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)',
        card: '0 1px 2px 0 rgba(0,0,0,0.03)',
        elevated: '0 4px 24px -4px rgba(0,0,0,0.08)',
      },
      borderRadius: { '4xl': '2rem' },
      animation: { slideIn: 'slideIn 0.25s ease-out', fadeIn: 'fadeIn 0.2s ease-out' },
      keyframes: {
        slideIn: { from: { transform: 'translateX(-100%)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        fadeIn: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}

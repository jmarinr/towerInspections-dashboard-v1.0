/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0A2540', light: '#425466' },
        accent: { DEFAULT: '#635BFF', light: '#F6F5FF' },
        sidebar: { DEFAULT: '#FAFAFA' },
        success: { DEFAULT: '#0CBF5B', light: '#EEFBF3' },
        warning: { DEFAULT: '#D97706', light: '#FFFBEB' },
        danger: { DEFAULT: '#DF1B41', light: '#FFF0F3' },
        surface: { DEFAULT: '#FFFFFF' },
        muted: { DEFAULT: '#F6F8FA' },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', '1rem'],   // 11px
        'xs': ['0.75rem', '1.125rem'],   // 12px
        'sm': ['0.8125rem', '1.25rem'],  // 13px
        'base': ['0.875rem', '1.375rem'],// 14px
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.04)',
        'DEFAULT': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'md': '0 4px 12px rgba(0,0,0,0.06)',
        'lg': '0 8px 30px rgba(0,0,0,0.08)',
        'ring': '0 0 0 3px rgba(99,91,255,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}

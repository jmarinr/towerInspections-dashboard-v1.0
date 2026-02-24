/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0F2A4A', light: '#1E3A5F' },
        accent: { DEFAULT: '#FF934F', light: '#FFE8DB' },
        sidebar: { DEFAULT: '#0B3D3E' },
        teal: {
          50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4',
          500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
          800: '#115e59', 900: '#134e4a',
        },
        success: { DEFAULT: '#22C55E', light: '#DCFCE7' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7' },
        danger: { DEFAULT: '#EF4444', light: '#FEE2E2' },
        surface: { DEFAULT: '#F8F9FC', card: '#FFFFFF' },
      },
      boxShadow: {
        soft: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        card: '0 1px 2px 0 rgba(0,0,0,0.04)',
        elevated: '0 4px 24px -4px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        slideIn: 'slideIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0F2A4A', light: '#1E3A5F' },
        accent: { DEFAULT: '#FF934F', light: '#FFE8DB' },
        success: { DEFAULT: '#22C55E', light: '#DCFCE7' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7' },
        danger: { DEFAULT: '#EF4444', light: '#FEE2E2' },
        surface: { DEFAULT: '#F6F7FB', card: '#FFFFFF' },
      },
      boxShadow: {
        soft: '0 2px 16px 0 rgba(15,42,74,0.08)',
        card: '0 1px 8px 0 rgba(15,42,74,0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

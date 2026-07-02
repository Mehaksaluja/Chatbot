/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        bg:      '#0f0f0f',
        surface: '#161616',
        raised:  '#1c1c1c',
        hover:   '#232323',
        line:    'rgba(255,255,255,0.07)',
      },
      boxShadow: {
        'menu': '0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset',
      },
    },
  },
  plugins: [],
}

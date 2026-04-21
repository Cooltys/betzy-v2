/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#0b1120',
          deep: '#060a15',
        },
        // semantic colors (Betzy brand)
        amber: {
          brand: '#eab308',
        },
        win: '#22c55e',
        loss: '#ef4444',
        warn: '#f97316',
        purple: {
          brand: '#a855f7',
        },
      },
      borderRadius: {
        'pill': '9999px',
      },
      boxShadow: {
        amber: '0 12px 30px -10px rgba(234,179,8,.5)',
        card: '0 4px 12px -4px rgba(0,0,0,.3)',
      },
      backgroundImage: {
        'bg-gradient': 'linear-gradient(180deg, #0b1120 0%, #060a15 100%)',
        'card-gradient': 'linear-gradient(180deg, #121b2f 0%, #0e1524 100%)',
        'amber-bg': 'linear-gradient(180deg, rgba(234,179,8,.08), rgba(234,179,8,.02))',
        'win-bg': 'linear-gradient(180deg, rgba(34,197,94,.08), rgba(34,197,94,.02))',
      },
    },
  },
  plugins: [],
}

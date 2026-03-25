/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card:    '0 2px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        float:   '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-dark': '0 2px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
        glow:    '0 0 20px rgba(99,102,241,0.35)',
        'glow-sm': '0 0 12px rgba(99,102,241,0.25)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out both',
        'slide-up':   'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-down': 'slideDown 0.2s ease-out both',
        'scale-in':   'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        'spin-slow':  'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(10px) scale(0.98)' }, to: { opacity: '1', transform: 'translateY(0) scale(1)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}

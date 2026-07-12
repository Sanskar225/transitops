/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#06080D',
        panel: '#10141C',
        panel2: '#171C26',
        border: '#232838',
        ink: '#EDEFF4',
        muted: '#8A93A6',
        beacon: '#F2C879',
        'beacon-dim': '#8A6E33',
        teal: '#49D6C4',
        danger: '#FF6B6B',
        violet: '#9C8CF2',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        beacon: '0 0 0 1px rgba(242,200,121,0.25), 0 0 24px -4px rgba(242,200,121,0.35)',
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};

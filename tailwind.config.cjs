module.exports = {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    borderRadius: {
      none: '0',
      sm: '0',
      DEFAULT: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '0',
    },
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'VT323', 'monospace'],
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        terminal: {
          bg: 'rgb(var(--c-bg) / <alpha-value>)',
          surface: 'rgb(var(--c-surface) / <alpha-value>)',
          green: 'rgb(var(--c-primary) / <alpha-value>)',
          'green-dim': 'rgb(var(--c-primary-dim) / <alpha-value>)',
          amber: 'rgb(var(--c-amber) / <alpha-value>)',
          red: 'rgb(var(--c-red) / <alpha-value>)',
          cyan: 'rgb(var(--c-cyan) / <alpha-value>)',
          border: 'rgb(var(--c-border) / <alpha-value>)',
          muted: 'rgb(var(--c-muted) / <alpha-value>)',
        },
      },
      boxShadow: {
        glow: '0 0 8px rgb(var(--c-primary) / 0.4), 0 0 20px rgb(var(--c-primary) / 0.1)',
        'glow-amber': '0 0 8px rgb(var(--c-amber) / 0.4), 0 0 20px rgb(var(--c-amber) / 0.1)',
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        scanline: 'scanline 8s linear infinite',
        typewriter: 'typewriter 2s steps(30) forwards',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        typewriter: {
          from: { width: '0' },
          to: { width: '100%' },
        },
      },
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: 'ss-',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#07111f',
          900: '#0b1728',
          850: '#112037',
          800: '#13263f',
        },
        accent: {
          cyan: '#56d4ff',
          lime: '#9cff7b',
          coral: '#ff7c6b',
          gold: '#f7d47b',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(134, 193, 255, 0.12), 0 22px 60px rgba(0, 0, 0, 0.35)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Pretendard Variable"', '"Segoe UI"', 'sans-serif'],
        body: ['"IBM Plex Sans KR"', '"Pretendard Variable"', '"Segoe UI"', 'sans-serif'],
      },
      backgroundImage: {
        'stock-grid':
          'linear-gradient(rgba(95, 144, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(95, 144, 255, 0.08) 1px, transparent 1px)',
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        pulseSoft: 'pulseSoft 3s ease-in-out infinite',
        rise: 'rise 350ms ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.75' },
          '50%': { opacity: '1' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
} satisfies Config;

import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: 'ap-',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        arena: {
          950: '#09111f',
          900: '#101b2d',
          850: '#152338',
          800: '#1b2e47',
          700: '#264161',
        },
        accent: {
          mint: '#7fe3c8',
          cyan: '#69c9ff',
          gold: '#f4c971',
          coral: '#ff8f70',
          rose: '#ff7394',
        },
      },
      fontFamily: {
        display: ['"Sora"', '"Pretendard Variable"', '"Segoe UI"', 'sans-serif'],
        body: ['"Pretendard Variable"', '"IBM Plex Sans KR"', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        chrome: '0 24px 60px rgba(4, 11, 24, 0.28)',
        glow: '0 0 0 1px rgba(105, 201, 255, 0.12), 0 24px 80px rgba(4, 11, 24, 0.38)',
      },
    },
  },
} satisfies Config;

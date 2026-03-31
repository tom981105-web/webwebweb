import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: 'rg-',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        panel: {
          950: '#070913',
          900: '#0d1220',
          850: '#13192b',
          800: '#182136',
        },
        mystic: {
          gold: '#f2cd72',
          amber: '#f59e54',
          teal: '#53d3c2',
          violet: '#a98cff',
          rose: '#ff7aa2',
          cyan: '#71d9ff',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Pretendard Variable"', '"Segoe UI"', 'sans-serif'],
        body: ['"Pretendard Variable"', '"IBM Plex Sans KR"', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 16px 48px rgba(0, 0, 0, 0.28)',
        glow: '0 0 0 1px rgba(134, 209, 255, 0.12), 0 24px 60px rgba(5, 9, 20, 0.45)',
        card: '0 26px 90px rgba(4, 8, 18, 0.55)',
      },
      backgroundImage: {
        vault:
          'radial-gradient(circle at top, rgba(113,217,255,0.14), transparent 30%), radial-gradient(circle at 80% 20%, rgba(169,140,255,0.12), transparent 28%), linear-gradient(180deg, rgba(12,18,34,0.96), rgba(7,10,20,0.96))',
        runes:
          'radial-gradient(circle at 20% 20%, rgba(242,205,114,0.08), transparent 18%), radial-gradient(circle at 80% 30%, rgba(83,211,194,0.12), transparent 20%), radial-gradient(circle at 50% 80%, rgba(169,140,255,0.12), transparent 24%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 1px rgba(242,205,114,0.16), 0 0 34px rgba(242,205,114,0.14)' },
          '50%': { boxShadow: '0 0 0 1px rgba(242,205,114,0.34), 0 0 48px rgba(242,205,114,0.28)' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        rewardPop: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.9)' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-32px) scale(1.06)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.6s ease-in-out infinite',
        riseIn: 'riseIn 260ms ease-out',
        rewardPop: 'rewardPop 1.4s ease-out forwards',
      },
    },
  },
} satisfies Config;

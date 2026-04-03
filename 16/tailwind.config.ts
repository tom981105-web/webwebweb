import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: 'pg-',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        forge: {
          950: '#060812',
          900: '#0b1220',
          850: '#111a2d',
          800: '#18243c',
          700: '#24324f',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"IBM Plex Sans KR"', '"Segoe UI"', 'sans-serif'],
        body: ['"IBM Plex Sans KR"', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        shell: '0 24px 80px rgba(2, 6, 20, 0.55)',
        card: '0 18px 60px rgba(4, 10, 24, 0.45)',
      },
      backgroundImage: {
        shell:
          'radial-gradient(circle at top, rgba(127,214,255,0.12), transparent 24%), radial-gradient(circle at 80% 12%, rgba(182,148,255,0.14), transparent 24%), linear-gradient(180deg, rgba(8,12,22,0.98), rgba(6,9,18,1))',
        panel:
          'linear-gradient(180deg, rgba(19,30,51,0.92), rgba(10,16,30,0.94))',
      },
    },
  },
} satisfies Config;

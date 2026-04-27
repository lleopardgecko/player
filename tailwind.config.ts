import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#dcdcdc',
        surface: '#ececec',
        surface2: '#d6d6d6',
        border: '#9a9a9a',
        borderLight: '#ffffff',
        muted: '#5a5a5a',
        accent: '#1a1a1a',
        accent2: '#1d6fe0',
        aqua: {
          light: '#eaf4ff',
          DEFAULT: '#3a8eff',
          dark: '#0a4ec2',
        },
      },
      backgroundImage: {
        metal:
          'linear-gradient(to bottom, #f3f3f3 0%, #d0d0d0 50%, #b8b8b8 100%)',
        'metal-dark':
          'linear-gradient(to bottom, #c8c8c8 0%, #a8a8a8 100%)',
        lcd: 'linear-gradient(to bottom, #cdd5dc 0%, #e5ebf0 100%)',
        'aqua-button':
          'linear-gradient(to bottom, #b8d8ff 0%, #4d92ec 50%, #2168c9 50%, #5fa6f3 100%)',
        selection:
          'linear-gradient(to bottom, #4a93ec 0%, #1d6fe0 100%)',
        pinstripe:
          'repeating-linear-gradient(to bottom, #ececec 0px, #ececec 1px, #e3e3e3 1px, #e3e3e3 2px)',
      },
      fontFamily: {
        sans: [
          '"Lucida Grande"',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;

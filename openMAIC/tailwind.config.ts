import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          700: '#1E3A5F',
          800: '#1a2f4d',
        },
        teal: {
          600: '#0891B2',
        },
        orange: {
          600: '#EA580C',
        },
      },
    },
  },
  plugins: [],
};

export default config;

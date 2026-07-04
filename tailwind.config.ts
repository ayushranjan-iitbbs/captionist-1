import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Captionist brand — bluish tone (aligned to thumbnail-baba palette family)
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Accent used like Kalakar's green, but blue
        accent: {
          DEFAULT: '#4f8cff',
          soft: '#6ea8ff',
          glow: '#3b82f6',
        },
        ink: {
          DEFAULT: '#0a0a0c',
          soft: '#101014',
          card: '#15151b',
          border: '#23232c',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(79, 140, 255, 0.55)',
        'glow-sm': '0 0 22px -6px rgba(79, 140, 255, 0.5)',
      },
      backgroundImage: {
        grid: 'linear-gradient(to right, rgba(79,140,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(79,140,255,0.06) 1px, transparent 1px)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;

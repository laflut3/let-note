/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: '0.75rem',
        md: 'calc(0.75rem - 2px)',
        sm: 'calc(0.75rem - 4px)',
      },
      colors: {
        border: 'hsl(24 15% 82%)',
        input: 'hsl(24 15% 82%)',
        ring: 'hsl(20 85% 42%)',
        background: 'hsl(35 100% 94%)',
        foreground: 'hsl(25 18% 14%)',
        primary: {
          DEFAULT: 'hsl(20 90% 45%)',
          foreground: 'hsl(35 100% 98%)',
        },
        secondary: {
          DEFAULT: 'hsl(35 70% 88%)',
          foreground: 'hsl(25 18% 14%)',
        },
        muted: {
          DEFAULT: 'hsl(32 42% 90%)',
          foreground: 'hsl(25 10% 35%)',
        },
        card: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(25 18% 14%)',
        },
      },
    },
  },
  plugins: [],
};

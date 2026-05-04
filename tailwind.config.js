/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#050508', // Deepest background
          900: '#090A0F',
          800: '#11131A',
          700: '#1C1F2A',
          600: '#2A2E3D',
          500: '#343B4E',
          400: '#525B73',
        },
        steel: {
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1', 
          200: '#E2E8F0',
        },
        chrome: {
          600: '#9CA3AF',
          500: '#D1D5DB',
          400: '#E5E7EB',
          300: '#F3F4F6',
          200: '#F9FAFB',
          100: '#FFFFFF',
        },
        neon: {
          blue: '#3b82f6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 4s ease infinite',
        'pulse-light': 'pulseLight 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing': 'typing 1.5s infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 50%' },
          '100%': { backgroundPosition: '-200% 50%' },
        },
        pulseLight: {
          '0%, 100%': { opacity: '1', filter: 'brightness(1.2)' },
          '50%': { opacity: '.7', filter: 'brightness(0.9)' },
        },
        typing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(0.8)', opacity: '0.5' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
    },
  },
}

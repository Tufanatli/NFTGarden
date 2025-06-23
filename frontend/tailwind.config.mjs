/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Doğa Teması Renkleri
        background: "var(--background)",
        foreground: "var(--foreground)",
        'primary-accent': "var(--primary-accent)",
        'secondary-accent': "var(--secondary-accent)",
        'tertiary-accent': "var(--tertiary-accent)",
        // İşlevsel renkler
        'water-blue': "var(--water-blue)",
        'earth-brown': "var(--earth-brown)",
        'sun-yellow': "var(--sun-yellow)",
        'grow-green': "var(--grow-green)",
        'sell-orange': "var(--sell-orange)",
        'danger-red': "var(--danger-red)",
        'success-green': "var(--success-green)",
        // Arayüz renkleri
        'card-bg': "var(--card-bg)",
        'card-hover': "var(--card-hover)",
        'text-muted': "var(--text-muted)",
        'border-color': "var(--border-color)",
        'navbar-bg': "var(--navbar-bg)",
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        'nature-light': '0 4px 6px var(--shadow-light)',
        'nature-medium': '0 8px 16px var(--shadow-medium)',
        'nature-strong': '0 12px 24px var(--shadow-medium)',
      },
      animation: {
        'grow': 'grow 0.3s ease-in-out',
        'bounce-gentle': 'bounce-gentle 2s infinite',
      },
      keyframes: {
        grow: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        }
      }
    },
  },
  plugins: [],
};

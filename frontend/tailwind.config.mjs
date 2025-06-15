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
        background: "var(--background)",
        foreground: "var(--foreground)",
        'primary-accent': "var(--primary-accent)",
        'secondary-accent': "var(--secondary-accent)",
        'light-bg': '#F5EFE6',
        'light-fg': '#4A403A',
        'light-primary': '#8C6A56',
        'light-secondary': '#E8DFCA',
        'dark-bg': '#3E362F',
        'dark-fg': '#EAE0D6',
        'dark-primary': '#B08D74',
        'dark-secondary': '#5A504A',
      },
      fontFamily: {
        sans: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'ibm-plex-mono': ['var(--font-ibm-plex-mono)', 'monospace'],
        'roboto-mono': ['var(--font-roboto-mono)', 'monospace'],
        rinter: ['var(--font-rinter)', 'monospace']
      }
    }
  },
  plugins: []
};

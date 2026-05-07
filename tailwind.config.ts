import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        'bg-nav': 'var(--bg-nav)',
        'bg-sub-tg': 'var(--bg-sub-tg)',
        'bg-sub-mx': 'var(--bg-sub-mx)',
        'bg-sub-vk': 'var(--bg-sub-vk)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-light': 'var(--text-light)',
        border: 'var(--border)',
        'border-light': 'var(--border-light)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-text': 'var(--accent-text)',
        'tag-tp-bg': 'var(--tag-tp-bg)',
        'tag-tp-color': 'var(--tag-tp-color)',
        'tag-tp-border': 'var(--tag-tp-border)',
        'tag-lv-bg': 'var(--tag-lv-bg)',
        'tag-lv-color': 'var(--tag-lv-color)',
        'tag-lv-border': 'var(--tag-lv-border)',
        'tag-sp-bg': 'var(--tag-sp-bg)',
        'tag-sp-color': 'var(--tag-sp-color)',
        'tag-sp-border': 'var(--tag-sp-border)',
        // Brand constants
        brand: {
          yellow: '#ffcc3e',
          'yellow-hover': '#e6b800',
          tg: '#2aabee',
          mx: '#6c4ecb',
          vk: '#0077ff',
          green: '#1f8a50',
          'green-dark': '#4dbb78',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        wrap: '1280px',
      },
      gridTemplateColumns: {
        layout: '210px 1fr 220px',
        'post-layout': '1fr 280px',
        'footer-grid': '1.5fr 1fr 1fr 1fr',
      },
    },
  },
  plugins: [],
}
export default config

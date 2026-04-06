/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Vemo Brand Colors
        'vemo-green': {
          50: '#f3fce9',
          100: '#e4f8cf',
          200: '#cbf0a3',
          500: '#7ed957',
          600: '#6bc948',
          700: '#5cb338',
          800: '#3a7d23',
          900: '#2a611a',
        },
        'vemo-dark': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#5a6280',
          700: '#454d68',
          800: '#343b55',
          900: '#282f47',
        },
        // Semantic colors
        brand: {
          50: '#f3fce9',
          500: '#7ed957',
          600: '#6bc948',
          700: '#5cb338',
        },
        error: {
          500: '#dc2626',
          50: '#fef2f2',
        },
        warning: {
          500: '#f59e0b',
          50: '#fffbeb',
        },
        success: {
          500: '#7ed957',
        },
      },
      fontFamily: {
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.78rem', { lineHeight: '1.5' }],
        sm: ['0.85rem', { lineHeight: '1.5' }],
        base: ['1rem', { lineHeight: '1.6' }],
        lg: ['1.2rem', { lineHeight: '1.4' }],
        xl: ['1.5rem', { lineHeight: '1.4' }],
        '2xl': ['2.2rem', { lineHeight: '1.2', letterSpacing: '-0.5px' }],
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
      },
      transitionTimingFunction: {
        'vemo': 'cubic-bezier(.4,0,.2,1)',
      },
      transitionDuration: {
        'vemo': '200ms',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F7CF0',
        'primary-light': '#EEF2FF',
        secondary: '#7B5FE8',
        tertiary: '#FF7043',
        'tertiary-light': '#FFF4F0',
        success: '#34D399',
        'success-light': '#F0FFF4',
        danger: '#EF4444',
        'danger-light': '#FFF5F5',
        warning: '#F59E0B',
        'warning-light': '#FFF8EE',
        info: '#3B82F6',
        'text-primary': '#1F2937',
        'text-secondary': '#6B7280',
        'text-tertiary': '#9CA3AF',
        'bg-card': '#FFFFFF',
        'bg-secondary': '#F5F6FA',
        'border-light': '#E5E7EB',
        'border-card': '#F3F4F6'
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.1)',
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)'
      },
      borderRadius: {
        'card': '16px',
        '2xl': '16px'
      }
    },
  },
  plugins: [],
}
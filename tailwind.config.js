/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    './global.css',
  ],
  theme: {
    extend: {
      colors: {
        danger: '#C53334',
        neutral: '#F7F7F7',
        black: '#000000',
        white: '#FFFFFF',
      },
      spacing: {
        10: '10px',
        17: '17px',
        42: '42px',
        52: '52px',
        55: '55px',
        72: '72px',
      },
      borderRadius: {
        md: '16px',
      },
      backgroundColor: {
        'black-3': '#0000000A',
      },
      fontSize: {
        base: ['16px', '20px'],
        lg: ['18px', '22px'],
      },
    },
  },
  presets: [require("nativewind/preset")],
};

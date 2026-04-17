/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f7ff",
          100: "#ebeffe",
          200: "#d6defd",
          300: "#b4c1fb",
          400: "#8898f7",
          500: "#5d6ff1",
          600: "#4451e3",
          700: "#3940c4",
          800: "#2f369e",
          900: "#2a317d",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

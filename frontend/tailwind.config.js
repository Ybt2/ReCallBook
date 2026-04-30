/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        oc: {
          dark: "rgb(var(--oc-dark) / <alpha-value>)",
          light: "rgb(var(--oc-light) / <alpha-value>)",
          surface: "rgb(var(--oc-surface) / <alpha-value>)",
          mid: "rgb(var(--oc-mid) / <alpha-value>)",
          muted: "rgb(var(--oc-muted) / <alpha-value>)",
          border: "rgb(var(--oc-border) / <alpha-value>)",
          "input-bg": "rgb(var(--oc-input-bg) / <alpha-value>)",
          "input-fg": "rgb(var(--oc-input-fg) / <alpha-value>)",
        },
        brand: {
          50: "#e0f2fe",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#007aff",
          600: "#007aff",
          700: "#0056b3",
          800: "#004085",
          900: "#003366",
        },
        danger: {
          DEFAULT: "#ff3b30",
          hover: "#d70015",
          active: "#a50011",
        },
        success: {
          DEFAULT: "#30d158",
        },
        warning: {
          DEFAULT: "#ff9f0a",
          hover: "#cc7f08",
          active: "#995f06",
        },
      },
      fontFamily: {
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      borderRadius: {
        btn: "4px",
        input: "6px",
      },
      borderColor: {
        warm: "var(--border-warm)",
      },
      transitionDuration: {
        fast: "150ms",
      },
    },
  },
  plugins: [],
};

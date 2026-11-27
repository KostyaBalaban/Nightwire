/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ember: {
          300: "#f4a48a",
          400: "#ed7355",
          500: "#e85d3a",
          600: "#c9373d",
          700: "#a82830",
        },
      },
      animation: {
        "msg-in": "msgIn 0.18s ease-out both",
      },
      keyframes: {
        msgIn: {
          from: { opacity: "0", transform: "translateY(10px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0)   scale(1)" },
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        nightwire: {
          primary: "#e85d3a",
          "primary-content": "#ffffff",
          secondary: "#c9373d",
          "secondary-content": "#ffffff",
          accent: "#4ade80",
          neutral: "#232232",
          "neutral-content": "#e2ddd6",
          "base-100": "#0d0d14",
          "base-200": "#13131e",
          "base-300": "#1c1b2a",
          "base-content": "#f0ede8",
          info: "#6b7fa3",
          success: "#4ade80",
          warning: "#fbbf24",
          error: "#ff4757",
        },
      },
      {
        nightwire_light: {
          primary: "#c94a28",
          "primary-content": "#ffffff",
          secondary: "#a83228",
          "secondary-content": "#ffffff",
          accent: "#22c55e",
          neutral: "#dedad5",
          "neutral-content": "#1a1916",
          "base-100": "#f4f3f0",
          "base-200": "#ffffff",
          "base-300": "#eeecea",
          "base-content": "#1a1916",
          info: "#6b7fa3",
          success: "#22c55e",
          warning: "#d97706",
          error: "#dc2626",
        },
      },
    ],
    defaultTheme: "nightwire",
  },
};

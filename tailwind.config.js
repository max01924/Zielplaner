/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-bg-to)",
        "canvas-deep": "var(--color-bg-to)",
        surface: "var(--color-bg-to)",
        "surface-elevated": "var(--color-bg-to)",
        "surface-hover": "var(--color-bg-via)",
        line: "rgba(242, 242, 240, 0.10)",
        "line-strong": "rgba(242, 242, 240, 0.18)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        subtle: "var(--color-subtle)",
        inverse: "var(--color-inverse)",
        accent: "rgb(var(--color-accent-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        panel: "1.75rem",
        control: "1rem",
      },
      boxShadow: {
        panel:
          "inset 2px 2px 3px rgba(255, 255, 255, 0.07), inset -2px -2px 4px rgba(0, 0, 0, 0.38), inset -16px -16px 34px rgba(0, 0, 0, 0.10), 0 24px 70px rgba(0, 0, 0, 0.28)",
        card:
          "inset 2px 2px 3px rgba(255, 255, 255, 0.07), inset -2px -2px 4px rgba(0, 0, 0, 0.34), inset -12px -12px 28px rgba(0, 0, 0, 0.09), 0 16px 44px rgba(0, 0, 0, 0.22)",
        inset:
          "inset 1px 1px 2px rgba(255, 255, 255, 0.07), inset -2px -2px 4px rgba(0, 0, 0, 0.42)",
      },
      backgroundImage: {
        "premium-canvas":
          "radial-gradient(100% 72% at 50% 0%, var(--color-bg-from) 0%, var(--color-bg-via) 38%, var(--color-bg-to) 100%)",
      },
    },
  },
  plugins: [],
};

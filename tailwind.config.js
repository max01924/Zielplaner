/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--color-bg-to-rgb) / <alpha-value>)",
        "canvas-deep": "rgb(var(--color-bg-to-rgb) / <alpha-value>)",
        surface: "rgb(var(--color-bg-to-rgb) / <alpha-value>)",
        "surface-elevated": "rgb(var(--color-bg-to-rgb) / <alpha-value>)",
        "surface-hover": "rgb(var(--color-bg-via-rgb) / <alpha-value>)",
        line: "rgb(var(--color-line-rgb) / 0.10)",
        "line-strong": "rgb(var(--color-line-rgb) / 0.18)",
        ink: "rgb(var(--color-ink-rgb) / <alpha-value>)",
        muted: "rgb(var(--color-muted-rgb) / <alpha-value>)",
        subtle: "rgb(var(--color-subtle-rgb) / <alpha-value>)",
        inverse: "rgb(var(--color-inverse-rgb) / <alpha-value>)",
        accent: "rgb(var(--color-accent-rgb) / <alpha-value>)",
        "accent-contrast": "var(--color-accent-contrast)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        panel: "1.75rem",
        control: "1rem",
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        card: "var(--shadow-card)",
        inset: "var(--shadow-inset)",
      },
      backgroundImage: {
        "premium-canvas":
          "radial-gradient(100% 72% at 50% 0%, var(--color-bg-from) 0%, var(--color-bg-via) 38%, var(--color-bg-to) 100%)",
      },
    },
  },
  plugins: [],
};

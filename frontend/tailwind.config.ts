import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        accent:  "#ff5a3c",
        accent2: "#ff7d64",
        panel:   "#0e1117",
        panel2:  "#11141a",
        ink:     "#f0f2f5",
        muted:   "#8b929f",
      },
      animation: {
        "aurora":     "aurora 14s ease-in-out infinite alternate",
        "fade-up":    "fadeUp .5s ease both",
        "spin-slow":  "spin-slow 1.6s linear infinite",
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
      },
      keyframes: {
        aurora: {
          "0%":   { transform: "translate(0,0) scale(1)" },
          "33%":  { transform: "translate(3%,-4%) scale(1.04)" },
          "66%":  { transform: "translate(-2%,5%) scale(.97)" },
          "100%": { transform: "translate(4%,-2%) scale(1.03)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        "pulse-ring": {
          "0%":   { boxShadow: "0 0 0 0 rgba(255,90,60,.5)" },
          "70%":  { boxShadow: "0 0 0 12px rgba(255,90,60,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(255,90,60,0)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        fog: "#f6f7f9",
        line: "#d9dee7",
        brand: "#0f766e",
        accent: "#b45309"
      }
    }
  },
  plugins: []
} satisfies Config;

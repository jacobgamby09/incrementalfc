import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          50: "#effaf1",
          100: "#d8f1dc",
          500: "#2f8f46",
          700: "#236b36",
          900: "#163f24"
        }
      }
    }
  },
  plugins: []
} satisfies Config;

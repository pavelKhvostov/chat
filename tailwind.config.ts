import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          bg: "#EEF1FC",
          surface: "#FFFFFF",
          primary: "#5865DC",
          "primary-hover": "#4753C8",
          "primary-soft": "#E8ECFA",
          "primary-muted": "#C7CEEC",
          text: "#1A1F3A",
          "text-muted": "#8E94B0",
          "text-subtle": "#B8BDD4",
          border: "#E1E5F2",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(26, 31, 58, 0.04), 0 1px 3px 0 rgba(26, 31, 58, 0.06)",
        "card-hover": "0 2px 4px 0 rgba(26, 31, 58, 0.06), 0 4px 8px 0 rgba(26, 31, 58, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;

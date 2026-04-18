import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        foreground: "var(--ink-900)",
        coral: {
          50:  "#FFF3ED",
          100: "#FFE4D9",
          400: "#FF8A65",
          500: "#FF6A3D",
          600: "#F2521F",
        },
        navy: {
          500: "#2E3E63",
          700: "#1B2742",
          800: "#111A2E",
          900: "#0B1220",
        },
        ink: {
          50:  "#F2F4FB",
          100: "#E8ECF5",
          200: "#D9DEEA",
          300: "#B8C0D0",
          400: "#8891A5",
          500: "#5B6478",
          700: "#2A3145",
          900: "#0E1320",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          2: "#F7F9FE",
        },
        stroke: {
          DEFAULT: "#E1E6F2",
          2: "#CCD3E5",
        },
        bg: "#EEF2FB",
        success: "#2EAE74",
        warning: "#E8A83C",
        danger: "#E04E4E",
        info: "#3E74E8",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        pill: "9999px",
      },
      boxShadow: {
        "sh-1": "0 1px 2px rgba(14,19,32,.06), 0 1px 1px rgba(14,19,32,.04)",
        "sh-2": "0 6px 18px rgba(14,19,32,.08), 0 2px 4px rgba(14,19,32,.04)",
        "sh-3": "0 24px 60px rgba(14,19,32,.12), 0 8px 20px rgba(14,19,32,.06)",
        "focus-ring": "0 0 0 3px rgba(255,106,61,.14)",
        "accent-glow": "0 2px 6px rgba(242,82,31,.35)",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["56px", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "800" }],
        h1: ["40px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2: ["28px", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "700" }],
        h3: ["20px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.5", fontWeight: "500" }],
        small: ["13px", { lineHeight: "1.45", fontWeight: "500" }],
        micro: ["11px", { letterSpacing: "0.06em", fontWeight: "600" }],
        "mono-sm": ["13px", { fontWeight: "500" }],
      },
      spacing: {
        "s-1": "4px",
        "s-2": "8px",
        "s-3": "12px",
        "s-4": "16px",
        "s-5": "20px",
        "s-6": "24px",
        "s-8": "32px",
        "s-10": "40px",
        "s-12": "48px",
        "s-16": "64px",
      },
    },
  },
  plugins: [],
};
export default config;

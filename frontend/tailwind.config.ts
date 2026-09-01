import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0d1117", soft: "#161b22", line: "#242c38" },
        paper: "#f5f3ee",
        signal: { ok: "#3fb950", warn: "#d29922", bad: "#f85149", cool: "#58a6ff" },
      },
      fontFamily: {
        doc: ["Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;

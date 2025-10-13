import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: '#1e1e1e',
          fg: '#d4d4d4',
          muted: '#6e6e6e',
          accent: '#007acc',
          error: '#f48771',
          success: '#4ec9b0',
        },
      },
      fontFamily: {
        mono: ['var(--font-jetbrains-mono)', 'Consolas', 'monospace'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

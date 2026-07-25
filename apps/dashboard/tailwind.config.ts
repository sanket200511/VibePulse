import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Standard Tailwind mappings ──────────────────────────────────────
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ── Semantic Theme Tokens (docs/design/COLOR_SYSTEM.md) ─────────────
        surface: "hsl(var(--card))",
        "elevated-surface": "hsl(var(--elevated))",
        "primary-text": "hsl(var(--foreground))",
        "secondary-text": "hsl(var(--muted-foreground))",
        "border-color": "hsl(var(--border))",
        "accent-color": "hsl(var(--primary))",
        "success-color": "hsl(var(--success))",
        "warning-color": "hsl(var(--warning))",
        "critical-color": "hsl(var(--destructive))",
        "observation-color": "hsl(var(--observation))",
        "focus-color": "hsl(var(--ring))",
        "muted-color": "hsl(var(--muted))",
        "hover-color": "hsl(var(--hover))",
        "selection-color": "hsl(var(--selection))",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

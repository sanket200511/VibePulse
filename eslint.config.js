import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // ── Ignore patterns ──────────────────────────────────────────────────────
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/*.min.js",
      "apps/api/**", // Python project – linted by ruff
    ],
  },

  // ── Base TypeScript rules (all TS/TSX files) ──────────────────────────────
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: true,
      },
      globals: {
        ...globals.es2022,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs["recommended"].rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },

  // ── React rules (TSX files inside apps/dashboard and packages/ui) ─────────
  {
    files: ["apps/dashboard/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed with React 17+
      "react/prop-types": "off", // TypeScript handles this
    },
  },

  // ── Node.js rules (daemon + scripts) ─────────────────────────────────────
  {
    files: ["apps/daemon/**/*.ts", "scripts/**/*.{ts,js,mjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // ── Prettier must be last (disables conflicting formatting rules) ─────────
  prettierConfig,
];

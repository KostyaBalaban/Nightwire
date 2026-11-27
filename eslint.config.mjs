import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },

  js.configs.recommended,

  // Backend: Node.js ES modules
  {
    files: ["backend/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    files: ["backend/src/__tests__/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },

  // Frontend: React in the browser
  {
    files: ["frontend/**/*.{js,jsx}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["frontend/src/__tests__/**/*.js", "frontend/*.config.js"],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },

  // Root tooling config files
  {
    files: ["*.{js,mjs}"],
    languageOptions: { globals: globals.node },
  },

  // Playwright end-to-end tests (Node, plus browser code inside page.evaluate)
  {
    files: ["e2e/**/*.{js,mjs}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  {
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  // Must be last: turns off rules that conflict with Prettier formatting
  prettier,
];

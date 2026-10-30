import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/attached_assets/**",
      "**/generated-artifacts/**",
    ],
  },
  tseslint.configs.base,
  {
    files: ["**/*.{cjs,js,mjs,ts,tsx}"],
    rules: {
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-debugger": "error",
      "no-unreachable": "error",
    },
  },
  {
    files: ["artifacts/sendflow/src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
    },
  },
];

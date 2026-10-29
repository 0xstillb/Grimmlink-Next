import tseslint from "typescript-eslint";
export default [
  { ignores: ["**/dist/**", "**/node_modules/**", "**/*.tsbuildinfo"] },
  ...tseslint.configs.recommended,
  { files: ["**/*.{ts,tsx}"], rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] } }
];

// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

const MODULE_BOUNDARY_MESSAGE =
  "Import module internals only through the module's public index (e.g. '../users/index.js', not '../users/users.service.js') — see src/modules/README.md.";

/**
 * Single flat config for the whole repo (root `src`, plus the `db` and
 * `types` workspace packages) — ESLint globs by file path, not by pnpm
 * workspace boundary, so one config file is enough.
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: ["**/dist/**", "**/build/**", "**/.turbo/**", "**/coverage/**"],
  },
  {
    // Anywhere in the codebase: an import whose specifier literally reaches
    // into `modules/<name>/<file>` (2+ levels up) must target that module's
    // index, not an internal file.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: String.raw`(^|\/)modules\/[^/]+\/(?!index(\.js)?$)[^/]+\.js$`,
              message: MODULE_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    // Only inside a module's own directory: a bare `../<sibling>/<file>.js`
    // relative import always resolves to another module's internals here.
    files: ["**/modules/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: String.raw`(^|\/)modules\/[^/]+\/(?!index(\.js)?$)[^/]+\.js$`,
              message: MODULE_BOUNDARY_MESSAGE,
            },
            {
              regex: String.raw`^\.\.\/[^./][^/]*\/(?!index(\.js)?$)[^/]+\.js$`,
              message: MODULE_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
    },
  },
);

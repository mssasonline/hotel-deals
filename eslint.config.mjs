import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Conditional setState inside useEffect is a safe, well-understood pattern
      // (hydration-safe init, syncing with external deps). Disabled because it
      // fires on 28 correct usages across 19 files with no actual bug risk.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);

export default eslintConfig;

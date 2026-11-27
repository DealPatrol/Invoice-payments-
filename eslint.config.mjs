import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    // mobile/ is the Vite + Capacitor app (no Next.js image optimizer there).
    files: ['mobile/**/*.{ts,tsx}'],
    rules: { '@next/next/no-img-element': 'off' },
  },
  globalIgnores([
    '.next/**',
    'coverage/**',
    'node_modules/**',
    'next-env.d.ts',
    // Native iOS project (generated Capacitor assets) and the built mobile bundle.
    'ios/**',
    'mobile/dist/**',
  ]),
]);

import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    '.next/**',
    'coverage/**',
    'node_modules/**',
    'next-env.d.ts',
    // Native iOS project (generated Capacitor assets) and the bundled offline shell.
    'ios/**',
    'ios-shell/**',
  ]),
]);

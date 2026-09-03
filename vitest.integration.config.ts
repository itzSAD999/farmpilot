import { defineConfig } from 'vitest/config';

// Integration tests — hit the real, linked Supabase project (generate_estimate()
// and the benchmark RPCs) using a throwaway test farm that is created and
// torn down within each run. Requires VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// in .env, same as the app itself. Run explicitly with `npm run test:integration`;
// kept out of the default `npm test` so that stays fast and network-free.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

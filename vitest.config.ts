import { defineConfig } from 'vitest/config';

// Fast, network-free unit tests only — pure functions, no live Supabase
// calls. Integration tests (against the real generate_estimate() RPC and
// friends) live in *.integration.test.ts and run separately via
// `npm run test:integration` (see vitest.integration.config.ts) so the
// default `npm test` never depends on network access or the live project.
export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['node_modules/**', 'dist/**', '**/*.integration.test.ts'],
  },
});

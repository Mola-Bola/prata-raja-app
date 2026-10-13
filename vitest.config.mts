import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Same "@/…" paths as tsconfig, so pure helpers under src/features can be tested too.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['scripts/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.ts', 'supabase/functions/**/__tests__/**/*.test.ts'], environment: 'node' },
});

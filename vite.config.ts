import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' 讓 GitHub Pages 的子路徑（/ontime-lucky-day/）與本機都能運作
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', sourcemap: false },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});

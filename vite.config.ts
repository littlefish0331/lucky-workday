import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' 讓網站放在網域根目錄（Vercel）或任何子路徑下、以及本機，資源路徑都能運作
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', sourcemap: false },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});

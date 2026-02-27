
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // NOTE: Using '/' for web PWA deployment. For Electron/Capacitor builds,
  // you may need to use './' instead. Consider environment-specific config
  // or separate build commands if supporting multiple platforms.
  base: '/',
  publicDir: 'public', // Explicitly set public directory
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  }
});

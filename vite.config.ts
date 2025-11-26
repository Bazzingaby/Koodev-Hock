import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Koodev-Hock/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
        rollupOptions: {
      output: {
        manualChunks: {
          babylon: ['@babylonjs/core', '@babylonjs/materials', '@babylonjs/loaders'],
          physics: ['@babylonjs/havok']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: ['@babylonjs/core', '@babylonjs/havok', '@babylonjs/materials', '@babylonjs/loaders']
  }
});

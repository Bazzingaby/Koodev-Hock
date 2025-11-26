import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Koodev-Hock/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/gui'],
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
    include: ['@babylonjs/core', '@babylonjs/havok', '@babylonjs/loaders', '@babylonjs/gui']
  }
});

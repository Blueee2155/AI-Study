import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 让Vite正确处理MediaPipe的WASM和二进制资源
  assetsInclude: ['**/*.wasm', '**/*.data', '**/*.binarypb'],
  optimizeDeps: {
    exclude: ['@mediapipe/face_mesh'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~@fontsource/ibm-plex-mono': '@fontsource/ibm-plex-mono',
      '~@fontsource/inter': '@fontsource/inter',
    },
  },
  build: {
    assetsInlineLimit: 0, // This ensures that all assets are processed as files
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          let extType = 'asset';
          if (assetInfo.name) {
            const ext = assetInfo.name.split('.').pop();
            if (ext) {
              extType = /png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext) ? 'images' : ext;
            }
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },
});

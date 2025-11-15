import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup/index.html'),
                offscreen: resolve(__dirname, 'src/offscreen/offscreen.html')
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: 'assets/[name].[ext]',
                chunkFileNames: 'assets/[name].js'
            }
        },
        emptyOutDir: true
    }
});
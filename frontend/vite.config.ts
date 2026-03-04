import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    base: '/',
    plugins: [
        nodePolyfills({
            globals: { Buffer: true, global: true, process: true },
            overrides: { crypto: 'crypto-browserify' },
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            global: 'global',
            undici: resolve(__dirname, 'node_modules/opnet/src/fetch/fetch-browser.js'),
        },
        mainFields: ['module', 'main', 'browser'],
        dedupe: ['@noble/curves', '@noble/hashes', '@scure/base', 'buffer', 'react', 'react-dom'],
    },
    optimizeDeps: {
        exclude: ['crypto-browserify'],
    },
    build: {
        commonjsOptions: { strictRequires: true, transformMixedEsModules: true },
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('crypto-browserify') || id.includes('randombytes')) return undefined;
                    if (id.includes('node_modules')) {
                        if (id.includes('@noble/curves')) return 'noble-curves';
                        if (id.includes('@noble/hashes')) return 'noble-hashes';
                        if (id.includes('@scure/')) return 'scure';
                        if (id.includes('@btc-vision/transaction')) return 'btc-transaction';
                        if (id.includes('@btc-vision/bitcoin')) return 'btc-bitcoin';
                        if (id.includes('node_modules/opnet')) return 'opnet';
                        if (id.includes('framer-motion')) return 'framer-motion';
                        if (id.includes('react-router')) return 'react-router';
                    }
                },
            },
        },
    },
});

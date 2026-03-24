import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
    plugins: [cesium()],
    base: '/',
    resolve: {
        alias: {
            // ensure imports of "cesium" resolve correctly
            cesium: 'cesium',
        },
    },
    optimizeDeps: {
        include: ['cesium'],
    },
});

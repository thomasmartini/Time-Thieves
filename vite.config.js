import { defineConfig } from "vite";
import cesium from "vite-plugin-cesium";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
    plugins: [
        cesium(),
        basicSsl()
    ],

    base: "/1013596/CesiumJS/",

    resolve: {
        alias: {
            cesium: "cesium",
        },
    },

    optimizeDeps: {
        include: ["cesium"],
    },

    server: {
        host: true,        // zodat telefoon kan verbinden
        https: true,       // HTTPS inschakelen
        port: 5173,
        proxy: {
            "/ar": {
                target: "https://arousal-scuba-pacify.ngrok-free.dev",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/ar/, ""),
            },
        },
    }
});
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'maps';
          }

          if (id.includes('recharts')) {
            return 'charts';
          }

          if (id.includes('framer-motion')) {
            return 'motion';
          }

          if (id.includes('react-router') || id.includes('/react-dom/') || id.includes('/react/')) {
            return 'react-core';
          }

          if (id.includes('sonner') || id.includes('zod')) {
            return 'utils';
          }

          return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

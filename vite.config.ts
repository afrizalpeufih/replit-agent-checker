import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        passes: 2,
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        dead_code: true,
        conditionals: true,
        evaluate: true,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          'tanstack-query': ['@tanstack/react-query'],
          'ui-dialog': ['@radix-ui/react-dialog', '@radix-ui/react-alert-dialog'],
          'ui-forms': ['@radix-ui/react-label', '@radix-ui/react-slot'],
          'ui-feedback': ['@radix-ui/react-toast', '@radix-ui/react-progress', '@radix-ui/react-tooltip'],
          'ui-navigation': ['@radix-ui/react-tabs'],
          'xlsx-vendor': ['xlsx'],
          'analytics': ['@vercel/analytics', '@vercel/speed-insights'],
          'ui-utils': ['class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
  },
}));

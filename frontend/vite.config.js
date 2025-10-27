import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    // Use modern target for smaller bundles and better performance
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    // Ensure clean builds
    emptyOutDir: true,
    // Generate manifest for cache busting
    manifest: false,
    // Adjust chunk size limit for Vercel deployment
    chunkSizeWarningLimit: 1000,
    // Optimize CSS loading - keep single CSS file to reduce render-blocking requests
    cssCodeSplit: false,
    cssMinify: true,
    // Use esbuild minification (default, faster than terser)
    minify: 'esbuild',
    // Optimize chunk splitting for better performance
    rollupOptions: {
      output: {
        // Ensure consistent module naming with content-based hashing
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Use content hash for better cache busting
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          // Optimize font file names
          if (ext === 'ttf' || ext === 'woff' || ext === 'woff2') {
            return `assets/fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
        // Manual chunks for better caching and parallel loading
        manualChunks: (id) => {
          // Separate vendor chunks for better caching
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    host: true, // Allow external connections
    port: 5173,
    strictPort: false, // Allow fallback to other ports
    proxy: {
      '/uploads': 'https://juanlms-webapp-server.onrender.com',
      '/api': 'https://juanlms-webapp-server.onrender.com',
      '/assignments': 'https://juanlms-webapp-server.onrender.com',
      '/announcements': 'https://juanlms-webapp-server.onrender.com',
      '/lessons': 'https://juanlms-webapp-server.onrender.com',
      '/classes': 'https://juanlms-webapp-server.onrender.com',
      '/events': 'https://juanlms-webapp-server.onrender.com',
      '/users': 'https://juanlms-webapp-server.onrender.com',
      '/quarters': 'https://juanlms-webapp-server.onrender.com',
      '/terms': 'https://juanlms-webapp-server.onrender.com',
      '/tracks': 'https://juanlms-webapp-server.onrender.com',
      '/strands': 'https://juanlms-webapp-server.onrender.com',
      '/sections': 'https://juanlms-webapp-server.onrender.com',
      '/faculty-assignments': 'https://juanlms-webapp-server.onrender.com',
      '/student-assignments': 'https://juanlms-webapp-server.onrender.com',
      '/subjects': 'https://juanlms-webapp-server.onrender.com',
      '/registrants': 'https://juanlms-webapp-server.onrender.com',
      '/class-dates': 'https://juanlms-webapp-server.onrender.com',
      '/quizzes': 'https://juanlms-webapp-server.onrender.com',
      '/notifications': 'https://juanlms-webapp-server.onrender.com',
      '/grading': 'https://juanlms-webapp-server.onrender.com',
      '/grades': 'https://juanlms-webapp-server.onrender.com'
    }
  }
})

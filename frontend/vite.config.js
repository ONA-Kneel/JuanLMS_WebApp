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
    rollupOptions: {
      output: {
        // Ensure consistent module naming with content-based hashing
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Use content hash for better cache busting
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    // Ensure clean builds
    emptyOutDir: true,
    // Generate manifest for cache busting
    manifest: false
  },
  server: {
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

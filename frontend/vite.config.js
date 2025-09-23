import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    proxy: {
      '/uploads': 'https://juanlms-webapp-server.onrender.com',
      '/api': 'https://juanlms-webapp-server.onrender.com',
      '/assignments': 'https://juanlms-webapp-server.onrender.com',
      '/announcements': 'https://juanlms-webapp-server.onrender.com',
      '/lessons': 'https://juanlms-webapp-server.onrender.com',
      '/classes': 'https://juanlms-webapp-server.onrender.com',
      '/events': 'https://juanlms-webapp-server.onrender.com'
    }
  }
})

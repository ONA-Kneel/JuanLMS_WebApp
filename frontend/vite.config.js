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
      '/uploads': 'http://localhost:5000',
      '/api': 'http://localhost:5000',
      '/assignments': 'http://localhost:5000',
      '/announcements': 'http://localhost:5000',
      '/lessons': 'http://localhost:5000',
      '/classes': 'http://localhost:5000',
      '/events': 'http://localhost:5000',
      '/users': 'http://localhost:5000',
      '/quarters': 'http://localhost:5000',
      '/terms': 'http://localhost:5000',
      '/tracks': 'http://localhost:5000',
      '/strands': 'http://localhost:5000',
      '/sections': 'http://localhost:5000',
      '/faculty-assignments': 'http://localhost:5000',
      '/student-assignments': 'http://localhost:5000',
      '/subjects': 'http://localhost:5000',
      '/registrants': 'http://localhost:5000',
      '/class-dates': 'http://localhost:5000',
      '/quizzes': 'http://localhost:5000',
      '/notifications': 'http://localhost:5000',
      '/grading': 'http://localhost:5000',
      '/grades': 'http://localhost:5000'
    }
  }
})

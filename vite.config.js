export default {
  server: {
    proxy: {
      '/uploads': 'http://localhost:5000',
    },
  },
}; 
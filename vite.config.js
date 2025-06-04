export default {
  server: {
    proxy: {
      '/uploads': '${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}',
    },
  },
}; 
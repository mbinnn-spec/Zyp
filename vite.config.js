import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/saveinsta-proxy': {
        target: 'https://saveinsta.to',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/saveinsta-proxy/, ''),
        headers: {
          'Origin': 'https://saveinsta.to',
          'Referer': 'https://saveinsta.to/en1'
        }
      },
      '/loader-proxy': {
        target: 'https://loader.to',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/loader-proxy/, ''),
        headers: {
          'Origin': 'https://loader.to',
          'Referer': 'https://loader.to/'
        }
      },
      '/loader-progress-proxy': {
        target: 'https://lto2.affadaffa.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/loader-progress-proxy/, ''),
        headers: {
          'Origin': 'https://loader.to',
          'Referer': 'https://loader.to/'
        }
      }
    }
  }
});

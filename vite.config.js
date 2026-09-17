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
      },
      '/bili-api': {
        target: 'https://api.bilibili.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bili-api/, ''),
        headers: {
          'Origin': 'https://www.bilibili.com',
          'Referer': 'https://www.bilibili.com/'
        }
      },
      '/bili-tv-api': {
        target: 'https://api.bilibili.tv',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bili-tv-api/, ''),
        headers: {
          'Origin': 'https://www.bilibili.tv',
          'Referer': 'https://www.bilibili.tv/'
        }
      },
      '/bili-tv-web': {
        target: 'https://www.bilibili.tv',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bili-tv-web/, ''),
        headers: {
          'Origin': 'https://www.bilibili.tv',
          'Referer': 'https://www.bilibili.tv/'
        }
      },
      '/bili-im-proxy': {
        target: 'https://bili.im',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bili-im-proxy/, ''),
        headers: {
          'Origin': 'https://bili.im',
          'Referer': 'https://bili.im/'
        }
      },
      '/bstar-akam-proxy': {
        target: 'https://upos-bstar1-mirrorakam.akamaized.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bstar-akam-proxy/, ''),
        headers: {
          'Origin': 'https://www.bilibili.tv',
          'Referer': 'https://www.bilibili.tv/'
        }
      },
      '/bstar-bili-proxy': {
        target: 'https://upos-sz-mirrorcosbstar1.bilivideo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bstar-bili-proxy/, ''),
        headers: {
          'Origin': 'https://www.bilibili.tv',
          'Referer': 'https://www.bilibili.tv/'
        }
      },
      '/threadster-proxy': {
        target: 'https://threadster.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/threadster-proxy/, ''),
        headers: {
          'Origin': 'https://threadster.app',
          'Referer': 'https://threadster.app/'
        }
      },
      '/getmyfb-proxy': {
        target: 'https://getmyfb.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/getmyfb-proxy/, ''),
        headers: {
          'Origin': 'https://getmyfb.com',
          'Referer': 'https://getmyfb.com/'
        }
      },
      '/tioo-pinterest-proxy': {
        target: 'https://backend1.tioo.eu.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tioo-pinterest-proxy/, ''),
        headers: {
          'Origin': 'https://backend1.tioo.eu.org',
          'Referer': 'https://backend1.tioo.eu.org/'
        }
      }
    }
  }
});

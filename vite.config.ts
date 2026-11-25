import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const buildId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Date.now()}`;

const emitBuildVersionPlugin = (id: string): Plugin => ({
  name: 'emit-build-version',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildId: id, builtAt: new Date().toISOString() }, null, 2),
    });
  },
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const reqPath = req.url?.split('?')[0];
      if (reqPath === '/version.json' || reqPath?.endsWith('/version.json')) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.end(JSON.stringify({ buildId: id, builtAt: new Date().toISOString() }));
        return;
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), emitBuildVersionPlugin(buildId)],
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    proxy: {
      '/WService.asmx': {
        target: 'https://api.yongjin.co.id',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

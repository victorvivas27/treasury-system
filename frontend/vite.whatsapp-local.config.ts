import { mergeConfig } from 'vite';
import baseConfig from './vite.config.ts';

// Only used by scripts/run-whatsapp-local.ps1, never by the normal build.
const publicUrl = new URL(process.env.WHATSAPP_LOCAL_PUBLIC_URL || 'http://127.0.0.1:5175');

export default mergeConfig(baseConfig, {
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
    allowedHosts: [publicUrl.hostname],
    proxy: {
      '/tesoreria/api/v1': {
        target: 'http://127.0.0.1:5055',
        changeOrigin: true,
      },
    },
  },
});

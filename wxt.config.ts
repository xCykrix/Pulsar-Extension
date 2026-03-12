import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Pulsar Extension',
    version: '1.0.0',
    permissions: [
      'storage',
      'tabs',
    ],
    host_permissions: [
      'http://localhost:8000/*',
      'https://cdn.discordapp.com/*',
      'https://fonts.googleapis.com/*',
    ],
  },
  webExt: {
    disabled: true,
  },
});

import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Pulsar Extension',
    version: '1.0.0',
    permissions: [
      'storage',
      'tabs',
      'notifications',
    ],
    host_permissions: [
      'http://localhost:9000/*',
      'https://fcmregistrations.googleapis.com/*',
      'https://firebaseinstallations.googleapis.com/*',
      'https://www.googleapis.com/*',
      'https://cdn.discordapp.com/*',
      'https://fonts.googleapis.com/*',
    ],
  },
  webExt: {
    disabled: true,
  },
});

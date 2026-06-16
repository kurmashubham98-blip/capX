import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/auto-icons'],
  manifest: {
    name: 'CapX - Context Transfer Hub',
    version: '0.1.0',
    description: 'Transfer full context between AI chat platforms and CLI tools',
    permissions: ['storage', 'unlimitedStorage'],
  },
  srcDir: 'src',
});

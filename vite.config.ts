import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Give every build its own service-worker cache, so a new deploy replaces the old files.
const stampServiceWorker = (): Plugin => ({
  name: 'stamp-service-worker',
  apply: 'build',
  writeBundle({ dir }) {
    const file = `${dir}/sw.js`;
    try {
      writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD_ID__', Date.now().toString(36)));
    } catch {
      // No service worker in this build.
    }
  },
});

export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  // Relative base so the same build works under any sub-path (e.g. /GuerdoLandia/ on GitHub Pages) and inside Capacitor.
  base: './',
});

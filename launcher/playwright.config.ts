import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  workers: 1,            // each test launches its own Electron instance
  reporter: 'list',
});

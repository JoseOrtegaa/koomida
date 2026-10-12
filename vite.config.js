import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/koomida/' : '/',
  test: { environment: 'jsdom', include: ['tests/**/*.test.{js,jsx}'], setupFiles: ['./tests/setup.js'] },
});


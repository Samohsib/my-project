// Playwright 설정: 아이패드 크기(가로·세로)에서 손가락 터치로 시험한다
import { defineConfig } from '@playwright/test';

const PORT = 8766;
const touch = { hasTouch: true, isMobile: true, deviceScaleFactor: 2, browserName: 'chromium' };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'ignore',
    timeout: 15_000,
  },
  projects: [
    { name: 'ipad-가로-1024x768', use: { ...touch, viewport: { width: 1024, height: 768 } } },
    { name: 'ipad-세로-768x1024', use: { ...touch, viewport: { width: 768, height: 1024 } } },
  ],
});

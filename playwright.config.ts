import { defineConfig, devices } from '@playwright/test'

// 开发服务器地址，优先读取环境变量，默认 3001
const devServerUrl = process.env.TEST_BASE_URL || 'http://localhost:3001'
// 如果设置了 TEST_BASE_URL，跳过 webServer 自动启动
const useExistingServer = !!process.env.TEST_BASE_URL

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'tests/e2e/report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'tests/e2e/test-results.json' }],
  ],
  use: {
    baseURL: devServerUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  // 未设置 TEST_BASE_URL 时才自动启动开发服务器
  ...(useExistingServer ? {} : {
    webServer: {
      command: 'pnpm dev',
      url: 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  }),
})

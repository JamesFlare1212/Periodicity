import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PERIODICITY_TEST_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
	testDir: './e2e',
	// Bun owns *.test.ts; browser regressions run only with Playwright.
	testMatch: '**/*.e2e.ts',
	fullyParallel: true,
	workers: process.env.CI ? 2 : undefined,
	retries: process.env.CI ? 1 : 0,
	reporter: 'list',
	use: {
		baseURL,
		viewport: { width: 1280, height: 900 },
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: process.env.PERIODICITY_TEST_URL
		? undefined
		: {
				command: 'bun run preview -- --host 127.0.0.1 --port 4173 --strictPort',
				url: baseURL,
				reuseExistingServer: !process.env.CI,
				timeout: 30000
			}
});

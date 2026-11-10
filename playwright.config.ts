import { defineConfig, devices } from '@playwright/test';

const port = process.env.PERIODICITY_TEST_PORT ?? '4173';
const baseURL = process.env.PERIODICITY_TEST_URL ?? `http://127.0.0.1:${port}`;
const browserDevices = {
	chromium: 'Desktop Chrome',
	firefox: 'Desktop Firefox',
	webkit: 'Desktop Safari'
} as const;
const projects = [...new Set((process.env.PERIODICITY_TEST_BROWSERS ?? 'chromium').split(','))].map(
	(name) => {
		if (name !== 'chromium' && name !== 'firefox' && name !== 'webkit')
			throw new Error(`Unknown PERIODICITY_TEST_BROWSERS entry: ${name}`);
		return { name, use: { ...devices[browserDevices[name]] } };
	}
);

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
	projects,
	webServer: process.env.PERIODICITY_TEST_URL
		? undefined
		: {
				command: `bun run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
				url: baseURL,
				// Never silently test an unrelated application already using this port.
				reuseExistingServer: false,
				timeout: 30000
			}
});

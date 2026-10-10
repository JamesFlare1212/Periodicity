import { describe, expect, test } from 'bun:test';
import { runInNewContext } from 'node:vm';
import { renderAppTemplate } from '../../scripts/app-template.js';
import { THEME_COLORS } from './theme.js';

const html = await renderAppTemplate();
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!bootstrap) throw new Error('The initial view bootstrap is missing.');

function initialView(path: string, getTheme = (): string | null => null) {
	const dataset: Record<string, string> = { theme: 'dark' };
	let themeColor = THEME_COLORS.dark;
	runInNewContext(bootstrap!, {
		location: new URL(path, 'https://periodicity.example'),
		URL,
		document: {
			documentElement: { dataset },
			querySelector: () => ({
				setAttribute: (_name: string, value: string) => (themeColor = value)
			})
		},
		localStorage: { getItem: getTheme }
	});
	return { dataset, themeColor };
}

describe('prerendered query views', () => {
	test.each([
		'/?element=118',
		'/?display=electronAffinity',
		'/?temperature=6000',
		'/?family=actinide',
		'/trends/?property=density',
		'/trends?view=table',
		'/trends/?period=7',
		'/compare/?elements=118,103,88,1',
		'/compare/?elements=',
		'/calculator/?formula=CuSO4%C2%B75H2O',
		'/calculator/?formula=',
		'/element/118/?configuration=shell#electronic-heading',
		'/element/1?configuration=short'
	])('waits for the requested view before showing %s', (path) => {
		expect(initialView(path).dataset.initialView).toBe('pending');
	});

	test.each([
		'/',
		'/trends/',
		'/compare/',
		'/calculator/',
		'/element/118/',
		'/element/118/#electronic-heading',
		'/?display=families&temperature=298&family=',
		'/trends/?property=ionizationEnergy&view=chart&period=all',
		'/compare/?elements=6,14',
		'/calculator/?formula=H2O',
		'/element/118/?configuration=full',
		'/?utm_source=example',
		'/trends/?formula=H2O',
		'/calculator/?elements=6,14',
		'/does-not-exist/?configuration=shell',
		'/?display=invalid&temperature=NaN&family=invalid&element=0',
		'/trends/?property=atomicMass&view=invalid&period=8',
		'/element/1/?configuration=invalid',
		'/compare/?elements=06,14,6,invalid,999',
		'/?display=families&display=phase',
		'/trends/?view=chart&view=table'
	])('keeps ordinary prerendered content visible at %s', (path) => {
		expect(initialView(path).dataset.initialView).toBeUndefined();
	});

	test('unavailable storage does not prevent a query view from initializing', () => {
		const { dataset, themeColor } = initialView('/compare/?elements=118', () => {
			throw new Error('Storage unavailable');
		});
		expect(dataset).toEqual({ theme: 'dark', initialView: 'pending' });
		expect(themeColor).toBe(THEME_COLORS.dark);
	});

	test('restores the appearance before the query view is displayed', () => {
		expect(initialView('/calculator/?formula=NaCl', () => 'light')).toEqual({
			dataset: { theme: 'light', initialView: 'pending' },
			themeColor: THEME_COLORS.light
		});
	});

	test('startup code remains inline and excludes element records and chemistry', () => {
		expect(bootstrap!.length).toBeLessThan(12000);
		expect(bootstrap).not.toMatch(/\bimport\s*\(/);
		expect(bootstrap).not.toContain('electronConfiguration');
		expect(bootstrap).not.toContain('discoveredBy');
		expect(bootstrap).not.toContain('Oganesson');
	});
});

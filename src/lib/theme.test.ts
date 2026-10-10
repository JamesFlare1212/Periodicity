import { describe, expect, test } from 'bun:test';
import { applyTheme, restoreTheme, saveTheme, THEME_COLORS } from './theme.js';

function themeDocument() {
	const dataset: Record<string, string> = {};
	let color = '';
	return {
		dataset,
		get color() {
			return color;
		},
		target: {
			documentElement: { dataset },
			querySelector: () => ({ setAttribute: (_name: string, value: string) => (color = value) })
		} as unknown as NonNullable<Parameters<typeof applyTheme>[1]>
	};
}

describe('appearance application', () => {
	test('saved appearance and toggling synchronize the page and browser chrome through one primitive', () => {
		const document = themeDocument();
		const saved = new Map([['periodicity-theme', 'light']]);
		const storage = {
			getItem: (key: string) => saved.get(key) ?? null,
			setItem: (key: string, value: string) => saved.set(key, value)
		};
		expect(restoreTheme(document.target, storage)).toBe('light');
		expect(document.dataset.theme).toBe('light');
		expect(document.color).toBe(THEME_COLORS.light);
		saveTheme('dark', document.target, storage);
		expect(document.dataset.theme).toBe('dark');
		expect(document.color).toBe(THEME_COLORS.dark);
		expect(saved.get('periodicity-theme')).toBe('dark');
	});

	test('unavailable storage does not prevent restoration or toggling', () => {
		const document = themeDocument();
		const storage = {
			getItem: () => {
				throw new Error('Denied');
			},
			setItem: () => {
				throw new Error('Denied');
			}
		};
		expect(restoreTheme(document.target, storage)).toBe('dark');
		expect(() => saveTheme('light', document.target, storage)).not.toThrow();
		expect(document.dataset.theme).toBe('light');
		expect(document.color).toBe(THEME_COLORS.light);
	});

	test('unknown saved values use the default appearance', () => {
		const document = themeDocument();
		expect(
			restoreTheme(document.target, { getItem: () => 'invalid', setItem: () => undefined })
		).toBe('dark');
		expect(document.color).toBe(THEME_COLORS.dark);
	});
});

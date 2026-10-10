export type Theme = 'dark' | 'light';

export const THEME_COLORS: Record<Theme, string> = { dark: '#10151e', light: '#f5f7fa' };
const STORAGE_KEY = 'periodicity-theme';
type ThemeDocument = Pick<Document, 'documentElement' | 'querySelector'>;
type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function applyTheme(theme: Theme, target: ThemeDocument = document): void {
	target.documentElement.dataset.theme = theme;
	target.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

export function restoreTheme(target: ThemeDocument = document, storage?: ThemeStorage): Theme {
	let theme: Theme = 'dark';
	try {
		const saved = (storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY);
		if (saved === 'dark' || saved === 'light') theme = saved;
	} catch {
		// Appearance and query initialization remain usable when storage is unavailable.
	}
	applyTheme(theme, target);
	return theme;
}

export function saveTheme(
	theme: Theme,
	target: ThemeDocument = document,
	storage?: ThemeStorage
): void {
	applyTheme(theme, target);
	try {
		(storage ?? globalThis.localStorage)?.setItem(STORAGE_KEY, theme);
	} catch {
		// Saving appearance is optional.
	}
}

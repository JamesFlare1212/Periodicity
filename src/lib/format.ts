export interface NumberFormatOptions {
	locale?: string;
	maximumFractionDigits?: number;
	minimumFractionDigits?: number;
	/** Optional extra precision for nonzero values below smallValueThreshold. */
	smallValueMaximumFractionDigits?: number;
	smallValueThreshold?: number;
	missing?: string;
	unit?: string;
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Preserve each view's precision and missing-value wording through explicit options. */
export function formatNumber(
	value: number | null | undefined,
	{
		locale = 'en',
		maximumFractionDigits = 3,
		minimumFractionDigits = 0,
		smallValueMaximumFractionDigits,
		smallValueThreshold = 0.01,
		missing = 'Not available',
		unit = ''
	}: NumberFormatOptions = {}
): string {
	if (value == null || !Number.isFinite(value)) return missing;
	const precision =
		smallValueMaximumFractionDigits !== undefined &&
		value !== 0 &&
		Math.abs(value) < smallValueThreshold
			? smallValueMaximumFractionDigits
			: maximumFractionDigits;
	const key = JSON.stringify([locale, minimumFractionDigits, precision]);
	let formatter = numberFormats.get(key);
	if (!formatter) {
		formatter = new Intl.NumberFormat(locale, {
			minimumFractionDigits,
			maximumFractionDigits: precision
		});
		numberFormats.set(key, formatter);
	}
	const formatted = formatter.format(value);
	return unit ? `${formatted} ${unit}` : formatted;
}

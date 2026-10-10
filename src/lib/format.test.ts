import { describe, expect, test } from 'bun:test';
import { formatNumber } from './format.js';

describe('numeric presentation', () => {
	test('distinguishes a genuine zero from missing or nonfinite measurements', () => {
		expect(formatNumber(0, { unit: 'K' })).toBe('0 K');
		for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
			expect(formatNumber(value, { missing: 'Unknown', unit: 'K' })).toBe('Unknown');
		}
	});

	test('preserves the comparison and element-detail precision policies', () => {
		const comparison = {
			locale: 'en-US',
			maximumFractionDigits: 4,
			smallValueMaximumFractionDigits: 7
		};
		expect(formatNumber(1.23456789, comparison)).toBe('1.2346');
		expect(formatNumber(0.0000899, { ...comparison, unit: 'g/cm³' })).toBe('0.0000899 g/cm³');
		expect(formatNumber(-0.0000899, comparison)).toBe('-0.0000899');
		expect(formatNumber(0.01, comparison)).toBe('0.01');
		expect(formatNumber(1.2345678912, { locale: 'en', maximumFractionDigits: 10 })).toBe(
			'1.2345678912'
		);
	});

	test('makes locale, trailing zeros and small-value thresholds explicit', () => {
		expect(formatNumber(1234.5, { locale: 'de-DE' })).toBe('1.234,5');
		expect(
			formatNumber(1.2, { locale: 'en-US', minimumFractionDigits: 3, maximumFractionDigits: 3 })
		).toBe('1.200');
		expect(formatNumber(1.2, { maximumFractionDigits: 3 })).toBe('1.2');
		expect(
			formatNumber(0.012345, {
				maximumFractionDigits: 3,
				smallValueMaximumFractionDigits: 6,
				smallValueThreshold: 0.1
			})
		).toBe('0.012345');
	});
});

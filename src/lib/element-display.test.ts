import { describe, expect, test } from 'bun:test';
import { categoryById, getElement, ROOM_TEMPERATURE, trendDefinitions } from './data/elements';
import { getElementDisplay } from './element-display';

const element = (symbol: string) => {
	const result = getElement(symbol);
	if (!result) throw new Error(`Element ${symbol} missing`);
	return result;
};

describe('element display presentation', () => {
	test('restores the family palette and label independently of missing properties', () => {
		const oganesson = element('Og');
		const category = categoryById[oganesson.category];
		expect(getElementDisplay(oganesson, 'families')).toEqual({
			color: category.color,
			background: category.background,
			label: 'Element family',
			value: category.label,
			unit: '',
			unknown: false
		});
	});

	test('shows the selected trend measurement and unit using the heatmap palette', () => {
		expect(getElementDisplay(element('C'), 'atomicRadius')).toMatchObject({
			color: 'var(--text)',
			label: 'Atomic radius',
			value: '77',
			unit: 'pm',
			unknown: false
		});
		expect(getElementDisplay(element('F'), 'electronegativity').background).toBe(
			'color-mix(in srgb, var(--accent) 30%, var(--surface))'
		);
		for (const trend of trendDefinitions) {
			expect(getElementDisplay(element('C'), trend.id)).toMatchObject({
				label: trend.label,
				unit: trend.unit,
				unknown: false
			});
		}
	});

	test('distinguishes valid zero values and minimum intensities from unknown measurements', () => {
		expect(getElementDisplay(element('He'), 'electronAffinity')).toMatchObject({
			color: 'var(--text)',
			value: '0',
			unit: 'kJ/mol',
			unknown: false,
			background: 'var(--surface)'
		});
		expect(getElementDisplay(element('Og'), 'electronAffinity')).toMatchObject({
			color: 'var(--text)',
			value: 'Unknown',
			unit: '',
			unknown: true,
			background: 'var(--surface)'
		});
		expect(getElementDisplay(element('Fr'), 'electronegativity')).toMatchObject({
			value: '0.7',
			unit: 'Pauling scale',
			unknown: false,
			background: 'color-mix(in srgb, var(--accent) 0%, var(--surface))'
		});
		expect(getElementDisplay(element('Og'), 'atomicRadius')).toMatchObject({
			label: 'Atomic radius',
			value: 'Unknown',
			unit: '',
			unknown: true,
			background: 'var(--surface)'
		});
	});

	test('shows released-energy electron affinity values with one heatmap hue', () => {
		expect(getElementDisplay(element('Cl'), 'electronAffinity')).toMatchObject({
			color: 'var(--text)',
			label: 'Electron affinity',
			value: '349',
			unit: 'kJ/mol',
			unknown: false,
			background: 'color-mix(in srgb, var(--trend-electron-affinity) 30%, var(--surface))'
		});
		expect(getElementDisplay(element('H'), 'electronAffinity')).toMatchObject({
			value: '73',
			unit: 'kJ/mol',
			unknown: false
		});
		expect(getElementDisplay(element('Ca'), 'electronAffinity')).toMatchObject({
			value: '2',
			unit: 'kJ/mol',
			unknown: false
		});
	});

	test('deepens the same affinity hue as released energy increases', () => {
		const tintStrength = (symbol: string) => {
			const background = getElementDisplay(element(symbol), 'electronAffinity').background;
			expect(background).toContain('var(--trend-electron-affinity)');
			const match = background.match(/ ([\d.]+)%/);
			if (!match) throw new Error(`Missing affinity tint for ${symbol}`);
			return Number(match[1]);
		};
		expect(tintStrength('Ca')).toBeGreaterThan(0);
		expect(tintStrength('Ca')).toBeLessThan(tintStrength('H'));
		expect(tintStrength('H')).toBeLessThan(tintStrength('Cl'));
	});

	test('caps affinity tint strength without changing an above-range measurement', () => {
		const presentation = getElementDisplay(
			{ ...element('Cl'), electronAffinity: 700 },
			'electronAffinity'
		);
		expect(presentation.value).toBe('700');
		expect(presentation.background).toBe(
			'color-mix(in srgb, var(--trend-electron-affinity) 30%, var(--surface))'
		);
	});

	test('uses the current temperature for both phase colors and unknown status', () => {
		const astatine = element('At');
		expect(getElementDisplay(astatine, 'phase', 2000)).toEqual({
			color: 'var(--phase-unknown)',
			background: 'color-mix(in srgb, var(--phase-unknown) 12%, var(--surface))',
			label: 'State at 2000 K',
			value: 'unknown',
			unit: '',
			unknown: true
		});
		expect(getElementDisplay(astatine, 'phase', 100)).toEqual({
			color: 'var(--phase-solid)',
			background: 'color-mix(in srgb, var(--phase-solid) 12%, var(--surface))',
			label: 'State at 100 K',
			value: 'solid',
			unit: '',
			unknown: false
		});
		expect(getElementDisplay(element('Br'), 'phase')).toMatchObject({
			color: 'var(--phase-liquid)',
			label: `State at ${Math.round(ROOM_TEMPERATURE)} K`,
			value: 'liquid',
			unknown: false
		});
		expect(getElementDisplay(element('Fe'), 'phase', 3134)).toMatchObject({
			color: 'var(--phase-gas)',
			value: 'gas',
			unknown: false
		});
	});
});

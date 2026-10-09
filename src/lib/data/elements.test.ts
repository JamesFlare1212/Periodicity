import { describe, expect, test } from 'bun:test';
import records from './element-records.json';
import {
	categories,
	elements,
	formatTrendValue,
	getElement,
	getPhaseAtTemperature,
	getTrendRange,
	getTrendValue,
	normalizeTrendValue,
	ROOM_TEMPERATURE,
	searchElements,
	trendDefinitions
} from './elements';

const element = (identifier: number | string) => {
	const result = getElement(identifier);
	if (!result) throw new Error(`Element ${identifier} missing`);
	return result;
};

describe('preserved reference data', () => {
	test('contains exactly the 118 distinct elements in atomic-number order', () => {
		expect(elements.map((entry) => entry.number)).toEqual(
			Array.from({ length: 118 }, (_, index) => index + 1)
		);
		expect(new Set(elements.map((entry) => entry.symbol)).size).toBe(118);
		for (const entry of elements) {
			expect(entry.shells.reduce((sum, electrons) => sum + electrons, 0)).toBe(entry.number);
			expect(entry.atomicMass).toBeGreaterThan(0);
			expect(entry.summary.length).toBeGreaterThan(20);
			expect(entry.electronConfiguration.length).toBeGreaterThan(0);
			expect(categories.some((category) => category.id === entry.category)).toBe(true);
		}
	});

	test('places every element exactly once in the 18-column table', () => {
		expect(new Set(elements.map((entry) => `${entry.xpos},${entry.ypos}`)).size).toBe(118);
		expect(element('He')).toMatchObject({ xpos: 18, ypos: 1, group: 18 });
		expect(element('La')).toMatchObject({ xpos: 3, ypos: 9, period: 6, group: null });
		expect(element('Lu')).toMatchObject({ xpos: 17, ypos: 9, group: null });
		expect(element('Ac')).toMatchObject({ xpos: 3, ypos: 10, period: 7, group: null });
		expect(element('Lr')).toMatchObject({ xpos: 17, ypos: 10, group: null });
		expect(element('Hf')).toMatchObject({ xpos: 4, ypos: 6, group: 4 });
		for (const entry of elements) {
			expect(entry.xpos).toBeGreaterThanOrEqual(1);
			expect(entry.xpos).toBeLessThanOrEqual(18);
		}
	});

	test('preserves the original family display conventions', () => {
		expect(element('Po').category).toBe('metalloid');
		expect(element('At').category).toBe('halogen');
		expect(element('Ts').category).toBe('halogen');
		expect(element('Nh').category).toBe('post-transition-metal');
		expect(element('Og').category).toBe('noble-gas');
		expect(elements.filter((entry) => entry.category === 'lanthanide')).toHaveLength(15);
		expect(elements.filter((entry) => entry.category === 'actinide')).toHaveLength(15);
	});

	test('keeps corrected measurements, gas density units, and genuine zero values', () => {
		expect(element('H').atomicMass).toBe(1.008);
		expect(element('Au').atomicMass).toBe(196.967);
		expect(element('Tc').atomicMass).toBe(98);
		expect(element('H').density).toBe(0.0000899);
		expect(element('He').density).toBe(0.0001785);
		expect(element('Kr').electronegativity).toBe(3);
		expect(element('Xe').electronegativity).toBe(2.6);
		expect(element('Fr').meltingPoint).toBe(300);
		expect(element('Rn').electronAffinity).toBe(0);
		expect(element('Zn').electronAffinity).toBe(0);
		expect(element('Og').electronegativity).toBeNull();
		expect(element('Og').phase).toBe('unknown');
	});

	test('converts attachment enthalpy into released-energy affinity without changing source records', () => {
		expect(
			records.find((record) => record.properties.symbol === 'H')?.properties.electronAffinity
		).toBe(-73);
		expect(
			records.find((record) => record.properties.symbol === 'Cl')?.properties.electronAffinity
		).toBe(-349);
		expect(element('H').electronAffinity).toBe(73);
		expect(element('Ca').electronAffinity).toBe(2);
		expect(element('Cl').electronAffinity).toBe(349);
		expect(element('Fr').electronAffinity).toBeNull();
		expect(element('Og').electronAffinity).toBeNull();
	});
});

describe('element lookup and search', () => {
	test('supports case-insensitive names, symbols, numbers, and spelling aliases', () => {
		expect(getElement('  fE  ')).toBe(element(26));
		expect(getElement('iron')).toBe(element(26));
		expect(getElement('26')).toBe(element(26));
		expect(getElement('aluminum')).toBe(element('Aluminium'));
		expect(getElement('sulphur')).toBe(element('Sulfur'));
		expect(getElement('cesium')).toBe(element('Caesium'));
		expect(getElement('')).toBeUndefined();
		expect(getElement(0)).toBeUndefined();
		expect(getElement(119)).toBeUndefined();
		expect(getElement('ir')).toBe(element('Iridium'));
	});

	test('ranks an exact match first and narrows multiple search words', () => {
		expect(searchElements('C')[0]).toBe(element('Carbon'));
		expect(searchElements('alkali metal').map((entry) => entry.symbol)).toEqual([
			'Li',
			'Na',
			'K',
			'Rb',
			'Cs',
			'Fr'
		]);
		expect(searchElements('noble gas')).toHaveLength(7);
		expect(searchElements('nonexistent element')).toHaveLength(0);
		expect(searchElements('')).toHaveLength(118);
	});
});

describe('temperature phase estimates', () => {
	test('follows transition thresholds including the exact boundaries', () => {
		const iron = element('Fe');
		expect(getPhaseAtTemperature(iron, 1810)).toBe('solid');
		expect(getPhaseAtTemperature(iron, 1811)).toBe('liquid');
		expect(getPhaseAtTemperature(iron, 3133)).toBe('liquid');
		expect(getPhaseAtTemperature(iron, 3134)).toBe('gas');
		expect(getPhaseAtTemperature(element('Br'), ROOM_TEMPERATURE)).toBe('liquid');
		expect(getPhaseAtTemperature(element('Hg'), ROOM_TEMPERATURE)).toBe('liquid');
		expect(getPhaseAtTemperature(element('H'), ROOM_TEMPERATURE)).toBe('gas');
	});

	test('does not turn unknown boundaries or nonphysical temperatures into a prediction', () => {
		expect(getPhaseAtTemperature(element('Og'), ROOM_TEMPERATURE)).toBe('unknown');
		expect(getPhaseAtTemperature(element('At'), 100)).toBe('solid');
		expect(getPhaseAtTemperature(element('At'), 2000)).toBe('unknown');
		expect(getPhaseAtTemperature(element('H'), -1)).toBe('unknown');
		expect(getPhaseAtTemperature(element('H'), Number.NaN)).toBe('unknown');
		expect(getPhaseAtTemperature(element('H'), Number.POSITIVE_INFINITY)).toBe('unknown');
	});

	test('never invents a liquid interval for the arsenic sublimation pair', () => {
		expect(getPhaseAtTemperature(element('As'), 886)).toBe('solid');
		expect(getPhaseAtTemperature(element('As'), 887)).toBe('gas');
		expect(getPhaseAtTemperature(element('As'), 1000)).toBe('gas');
	});
});

describe('trend data', () => {
	test('retains zero separately from unavailable measurements', () => {
		expect(getTrendValue(element('He'), 'electronAffinity')).toBe(0);
		expect(getTrendValue(element('Og'), 'electronAffinity')).toBeNull();
		expect(formatTrendValue(element('He'), 'electronAffinity')).toBe('0');
		expect(formatTrendValue(element('Og'), 'electronAffinity')).toBe('Unknown');
		expect(formatTrendValue(element('H'), 'density')).toBe('0.0000899');
	});

	test('normalizes each heatmap to its data range with missing data left missing', () => {
		expect(getTrendRange('electronegativity')).toEqual({ min: 0.7, max: 3.98 });
		expect(getTrendRange('electronAffinity')).toEqual({ min: 0, max: 349 });
		expect(normalizeTrendValue(element('F'), 'electronegativity')).toBe(1);
		expect(normalizeTrendValue(element('Fr'), 'electronegativity')).toBe(0);
		expect(normalizeTrendValue(element('Cl'), 'electronAffinity')).toBe(1);
		expect(normalizeTrendValue(element('He'), 'electronAffinity')).toBe(0);
		expect(normalizeTrendValue(element('Og'), 'electronegativity')).toBeNull();
		for (const trend of trendDefinitions) {
			for (const entry of elements) {
				const intensity = normalizeTrendValue(entry, trend.id);
				if (intensity !== null) {
					expect(intensity).toBeGreaterThanOrEqual(0);
					expect(intensity).toBeLessThanOrEqual(1);
				}
			}
		}
	});
});

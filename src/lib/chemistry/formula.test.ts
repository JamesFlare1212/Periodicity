import { describe, expect, test } from 'bun:test';
import {
	calculateMolarMass,
	FormulaError,
	formulaFragments,
	normalizeFormula,
	parseFormula,
	type FormulaElement
} from './formula';

const dataset: FormulaElement[] = [
	{ number: 1, symbol: 'H', name: 'Hydrogen', atomicMass: 1.008, category: 'nonmetal' },
	{ number: 6, symbol: 'C', name: 'Carbon', atomicMass: 12.011, category: 'nonmetal' },
	{ number: 7, symbol: 'N', name: 'Nitrogen', atomicMass: 14.007, category: 'nonmetal' },
	{ number: 8, symbol: 'O', name: 'Oxygen', atomicMass: 15.999, category: 'nonmetal' },
	{ number: 16, symbol: 'S', name: 'Sulfur', atomicMass: 32.06, category: 'nonmetal' },
	{ number: 19, symbol: 'K', name: 'Potassium', atomicMass: 39.0983, category: 'alkali-metal' },
	{
		number: 20,
		symbol: 'Ca',
		name: 'Calcium',
		atomicMass: 40.078,
		category: 'alkaline-earth-metal'
	},
	{ number: 26, symbol: 'Fe', name: 'Iron', atomicMass: 55.845, category: 'transition-metal' },
	{ number: 29, symbol: 'Cu', name: 'Copper', atomicMass: 63.546, category: 'transition-metal' }
];

const parse = (formula: string) => Object.fromEntries(parseFormula(formula, dataset));

describe('chemical formula parser', () => {
	test('parses water and glucose with one- and two-digit counts', () => {
		expect(parse('H2O')).toEqual({ H: 2, O: 1 });
		expect(parse('C6H12O6')).toEqual({ C: 6, H: 12, O: 6 });
	});

	test('multiplies nested parentheses and brackets', () => {
		expect(parse('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 });
		expect(parse('K4[Fe(CN)6]')).toEqual({ K: 4, Fe: 1, C: 6, N: 6 });
		expect(parse('(Ca(OH)2)3')).toEqual({ Ca: 3, O: 6, H: 6 });
	});

	test('merges repeated elements and handles pasted chemical subscripts', () => {
		expect(parse('CH3COOH')).toEqual({ C: 2, H: 4, O: 2 });
		expect(parse(' H₂O ')).toEqual({ H: 2, O: 1 });
		expect(normalizeFormula('C₆H₁₂O₆')).toBe('C6H12O6');
	});

	test('hydrates and leading coefficients multiply whole formula parts', () => {
		expect(parse('CuSO4·5H2O')).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
		expect(parse('2H2O')).toEqual({ H: 4, O: 2 });
	});

	test('rejects unknown and incorrectly capitalized symbols', () => {
		expect(() => parse('Xx2')).toThrow('not an element symbol');
		expect(() => parse('h2o')).toThrow('capital letter');
		expect(() => parse('COh')).toThrow('not an element symbol');
	});

	test('rejects empty, unbalanced, mismatched, and empty groups', () => {
		for (const formula of ['', ' ', 'Ca(OH2', 'H2O)', 'Ca[OH)2', 'Ca()2', '( )']) {
			expect(() => parse(formula)).toThrow(FormulaError);
		}
	});

	test('rejects invalid counts and numeric overflow', () => {
		for (const formula of [
			'H0',
			'H02',
			'H-2',
			'H1.5',
			'H2.5O',
			'H9007199254740992',
			'(H9007199254740991)2'
		]) {
			expect(() => parse(formula)).toThrow(FormulaError);
		}
	});

	test('rejects misplaced separators, ionic charges, and excessive nesting', () => {
		for (const formula of [
			'H2O·',
			'·H2O',
			'H2O··H2O',
			'(H2O·H2O)',
			'Ca2+',
			`${'('.repeat(34)}H${')'.repeat(34)}`
		]) {
			expect(() => parse(formula)).toThrow(FormulaError);
		}
	});

	test('reports the location of unknown symbols', () => {
		try {
			parseFormula('Ca(Xx)2', dataset);
			throw new Error('Expected formula validation to fail');
		} catch (error) {
			expect(error).toBeInstanceOf(FormulaError);
			expect((error as FormulaError).position).toBe(3);
		}
	});
});

describe('molar mass calculation', () => {
	test('returns water mass, atom counts, and mass percentages', () => {
		const result = calculateMolarMass('H₂O', dataset);
		expect(result.formula).toBe('H2O');
		expect(result.totalMass).toBeCloseTo(18.015, 6);
		expect(result.totalAtoms).toBe(3);
		expect(result.composition.find((entry) => entry.element.symbol === 'H')?.mass).toBeCloseTo(
			2.016,
			6
		);
		expect(result.composition.reduce((total, entry) => total + entry.percentage, 0)).toBeCloseTo(
			100,
			6
		);
	});

	test('calculates grouped and hydrated compounds without intermediate rounding', () => {
		expect(calculateMolarMass('Ca(OH)2', dataset).totalMass).toBeCloseTo(74.092, 6);
		expect(calculateMolarMass('C6H12O6', dataset).totalMass).toBeCloseTo(180.156, 6);
		expect(calculateMolarMass('CuSO4·5H2O', dataset).totalMass).toBeCloseTo(249.677, 6);
	});

	test('refuses unavailable atomic masses', () => {
		expect(() => calculateMolarMass('H2', [{ ...dataset[0], atomicMass: NaN }])).toThrow(
			'No atomic mass is available'
		);
	});

	test('keeps hydrate coefficients in normal text and atom counts in subscripts', () => {
		expect(formulaFragments('CuSO4·5H2O')).toEqual([
			{ text: 'CuSO', subscript: false },
			{ text: '4', subscript: true },
			{ text: '·', subscript: false },
			{ text: '5', subscript: false },
			{ text: 'H', subscript: false },
			{ text: '2', subscript: true },
			{ text: 'O', subscript: false }
		]);
	});
});

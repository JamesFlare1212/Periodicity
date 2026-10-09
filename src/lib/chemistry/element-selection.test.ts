import { describe, expect, test } from 'bun:test';
import { getElement } from '../data/elements';
import { calculateElementSelection } from './element-selection';

describe('periodic table mass addition', () => {
	test('reproduces the original Cr2MnFe2 calculation', () => {
		const result = calculateElementSelection(
			[24, 24, 25, 26, 26].map((number) => getElement(number)!)
		)!;
		expect(result.formula).toBe('Cr2MnFe2');
		expect(result.totalMass).toBeCloseTo(270.62, 6);
		expect(result.totalAtoms).toBe(5);
		expect(result.composition.map(({ element, count }) => [element.symbol, count])).toEqual([
			['Cr', 2],
			['Mn', 1],
			['Fe', 2]
		]);
	});

	test('merges nonadjacent repetitions in first-added order', () => {
		const result = calculateElementSelection([8, 1, 8, 1, 1].map((number) => getElement(number)!))!;
		expect(result.formula).toBe('O2H3');
		expect(result.totalMass).toBeCloseTo(35.022, 6);
		expect(result.composition.map(({ count }) => count)).toEqual([2, 3]);
	});

	test('handles empty, single-atom, and detached f-block selections', () => {
		expect(calculateElementSelection([])).toBeNull();
		const hydrogen = getElement(1)!;
		expect(calculateElementSelection([hydrogen])?.formula).toBe('H');
		expect(calculateElementSelection([hydrogen])?.totalMass).toBe(hydrogen.atomicMass);
		const lanthanum = getElement(57)!;
		const actinium = getElement(89)!;
		const result = calculateElementSelection([lanthanum, actinium, lanthanum])!;
		expect(result.formula).toBe('La2Ac');
		expect(result.totalMass).toBeCloseTo(2 * lanthanum.atomicMass + actinium.atomicMass, 6);
	});
});

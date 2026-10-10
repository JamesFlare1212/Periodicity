import { describe, expect, test } from 'bun:test';
import { elements, getElement } from '#lib/data/elements.js';
import { getElementNeighbor } from './element-navigation.js';

describe('element keyboard navigation', () => {
	test('table navigation retains the explicit atomic or spatial horizontal strategy', () => {
		const helium = getElement(2)!;
		expect(
			getElementNeighbor(elements, helium, 'ArrowRight', {
				layout: 'table',
				horizontal: 'atomic'
			})?.number
		).toBe(3);
		expect(
			getElementNeighbor(elements, helium, 'ArrowRight', {
				layout: 'table',
				horizontal: 'spatial'
			})?.number
		).toBe(2);
		expect(
			getElementNeighbor(elements, getElement(1)!, 'ArrowDown', {
				layout: 'table'
			})?.number
		).toBe(3);
	});
	test('grid navigation follows visible candidates and the actual column count', () => {
		const nobleGases = elements.filter((element) => element.category === 'noble-gas');
		expect(
			getElementNeighbor(nobleGases, getElement(2)!, 'ArrowDown', {
				layout: 'grid',
				columns: 4
			})?.number
		).toBe(54);
		expect(
			getElementNeighbor(nobleGases, getElement(36)!, 'ArrowRight', {
				layout: 'grid',
				columns: 4
			})?.number
		).toBe(36);
		expect(
			getElementNeighbor(nobleGases, getElement(54)!, 'ArrowUp', {
				layout: 'grid',
				columns: 4
			})?.number
		).toBe(2);
	});
	test('Home and End distinguish the row from the whole table', () => {
		expect(
			getElementNeighbor(elements, getElement(6)!, 'Home', {
				layout: 'grid',
				columns: 4
			})?.number
		).toBe(5);
		expect(
			getElementNeighbor(elements, getElement(6)!, 'End', {
				layout: 'grid',
				columns: 4,
				wholeTable: true
			})?.number
		).toBe(118);
		expect(
			getElementNeighbor(elements, getElement(6)!, 'Home', {
				layout: 'table'
			})?.number
		).toBe(3);
	});
	test('the incomplete last row and non-navigation keys preserve safe focus behavior', () => {
		expect(
			getElementNeighbor(elements, getElement(118)!, 'ArrowRight', {
				layout: 'grid',
				columns: 4
			})?.number
		).toBe(118);
		expect(
			getElementNeighbor(elements, getElement(117)!, 'ArrowDown', {
				layout: 'grid',
				columns: 4
			})?.number
		).toBe(117);
		expect(
			getElementNeighbor(elements, getElement(6)!, 'Enter', {
				layout: 'grid',
				columns: 4
			})
		).toBeUndefined();
	});
});

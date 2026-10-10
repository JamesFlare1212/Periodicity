import { describe, expect, test } from 'bun:test';
import { availableTrends, categories, trendDefinitions } from './data/metadata.js';
import {
	VIEW_DEFAULTS,
	needsInitialView,
	readCalculatorView,
	readCompareView,
	readElementView,
	readExploreView,
	readTrendsView,
	type ExploreDisplay
} from './view-state.js';

const parameters = (query = '') => new URLSearchParams(query);

describe('route state shared with first paint', () => {
	test('all route readers use the same defaults as the bootstrap', () => {
		expect(readExploreView(parameters())).toEqual({
			...VIEW_DEFAULTS.explore,
			families: [...VIEW_DEFAULTS.explore.families]
		});
		expect(readTrendsView(parameters())).toEqual(VIEW_DEFAULTS.trends);
		expect(readCompareView(parameters())).toEqual({
			elements: [...VIEW_DEFAULTS.compare.elements]
		});
		expect(readCalculatorView(parameters())).toEqual(VIEW_DEFAULTS.calculator);
		expect(readElementView(parameters())).toEqual(VIEW_DEFAULTS.element);
	});

	test('family query values are canonical, unique, and independent of query order', () => {
		const view = readExploreView(
			parameters('family=actinide,halogen,invalid&family=halogen&family=metalloid')
		);
		expect(view.families).toEqual(['metalloid', 'halogen', 'actinide']);
		expect(
			readExploreView(parameters(`family=${categories.map((family) => family.id)}`)).families
		).toHaveLength(categories.length);
	});

	test('all supported displays are accepted while unknown display modes use the default', () => {
		const displays: ExploreDisplay[] = [
			'families',
			'phase',
			...trendDefinitions.map((trend) => trend.id)
		];
		for (const display of displays) {
			expect(readExploreView(parameters(`display=${display}`)).display).toBe(display);
		}
		expect(readExploreView(parameters('display=unknown')).display).toBe(
			VIEW_DEFAULTS.explore.display
		);
	});

	test.each([
		['temperature=-1', 0],
		['temperature=7000', 6000],
		['temperature=273.15', 273.15],
		['temperature=NaN', VIEW_DEFAULTS.explore.temperature],
		['temperature=Infinity', VIEW_DEFAULTS.explore.temperature],
		['temperature=', 0]
	])('normalizes bounded temperature %s', (query, expected) => {
		expect(readExploreView(parameters(query)).temperature).toBe(expected);
	});

	test.each([
		['element=00118', '118'],
		['element=Og', 'Og'],
		['element=aluminium', 'aluminium'],
		['element=0', null],
		['element=119', null],
		['element=', null]
	])('keeps supported element identifiers without loading data: %s', (query, expected) => {
		expect(readExploreView(parameters(query)).element).toBe(expected);
	});

	test('trends accept every chart property and reject the explore-only mass display', () => {
		for (const property of availableTrends.map((trend) => trend.id)) {
			expect(readTrendsView(parameters(`property=${property}`)).property).toBe(property);
		}
		expect(readTrendsView(parameters('property=atomicMass&view=map&period=8'))).toEqual(
			VIEW_DEFAULTS.trends
		);
		expect(readTrendsView(parameters('property=density&view=table&period=7'))).toEqual({
			property: 'density',
			view: 'table',
			period: '7'
		});
	});

	test('comparison excludes invalid identifiers and duplicates before applying its limit', () => {
		expect(
			readCompareView(parameters('elements=118,118,0,999,invalid,103,88,1,6')).elements
		).toEqual([118, 103, 88, 1]);
		expect(readCompareView(parameters('elements=')).elements).toEqual([]);
		expect(readCompareView(parameters('elements=6.0,-1,H,06,14')).elements).toEqual([6, 14]);
	});

	test('an empty or invalid formula is preserved for the calculator to explain', () => {
		expect(readCalculatorView(parameters('formula=')).formula).toBe('');
		expect(readCalculatorView(parameters('formula=Xx2')).formula).toBe('Xx2');
		expect(readCalculatorView(parameters('formula=CuSO4%C2%B75H2O')).formula).toBe('CuSO4·5H2O');
	});

	test('duplicate scalar query values follow the same first-value rule in pages and bootstrap', () => {
		const url = new URL('https://periodicity.example/trends/?view=chart&view=table');
		expect(readTrendsView(url.searchParams).view).toBe('chart');
		expect(needsInitialView(url)).toBe(false);
	});

	test('returned selections never mutate the defaults', () => {
		readCompareView(parameters()).elements.push(118);
		readExploreView(parameters()).families.push('actinide');
		expect(VIEW_DEFAULTS.compare.elements).toEqual([6, 14]);
		expect(VIEW_DEFAULTS.explore.families).toEqual([]);
	});
});

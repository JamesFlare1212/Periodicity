import runtimeElements from './elements.generated.json';
import { formatNumber } from '../format.js';
import { categories, categoryById, trendDefinitions, type TrendId } from './metadata.js';
import type { Element, Phase } from './types.js';

export type { CategoryId, Element, Phase } from './types.js';
export {
	availableTrends,
	categories,
	categoryById,
	getCategoryLabel,
	trendById,
	trendDefinitions,
	type Category,
	type TrendDefinition,
	type TrendId
} from './metadata.js';

/** Precomputed data: reference conversion runs only in the generation tool and tests. */
export const elements: Element[] = runtimeElements as Element[];

const elementByNumber = new Map(elements.map((element) => [element.number, element]));
const elementByName = new Map(elements.map((element) => [element.name.toLowerCase(), element]));
const elementBySymbol = new Map(elements.map((element) => [element.symbol.toLowerCase(), element]));
const nameAliases: Record<string, number> = {
	aluminum: 13,
	aluminium: 13,
	sulphur: 16,
	sulfur: 16,
	cesium: 55,
	caesium: 55
};

/** Case-insensitive exact lookup. Partial matching belongs to searchElements. */
export function getElement(identifier: number | string): Element | undefined {
	if (typeof identifier === 'number') return elementByNumber.get(identifier);
	const query = identifier.trim().toLowerCase();
	if (!query) return undefined;
	if (/^\d+$/.test(query)) return elementByNumber.get(Number(query));
	return (
		elementBySymbol.get(query) ??
		elementByName.get(query) ??
		elementByNumber.get(nameAliases[query])
	);
}

/** Rank exact matches first; multiple words narrow rather than widen the result. */
export function searchElements(query: string): Element[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return [...elements];
	const family = categories.find(
		(category) =>
			normalized === category.label.toLowerCase() || normalized === category.id.replaceAll('-', ' ')
	);
	if (family) return elements.filter((element) => element.category === family.id);
	const exact = getElement(normalized);
	const terms = normalized.split(/\s+/);
	const matches = elements.filter((element) => {
		const category = categoryById[element.category];
		const aliases = Object.keys(nameAliases).filter(
			(alias) => nameAliases[alias] === element.number
		);
		const searchable =
			`${element.number} ${element.symbol} ${element.name} ${category.label} ${element.category.replaceAll('-', ' ')} ${aliases.join(' ')}`.toLowerCase();
		const words = searchable.split(/\s+/);
		return terms.every((term) => words.some((word) => word.startsWith(term)));
	});
	return exact ? [exact, ...matches.filter((element) => element !== exact)] : matches;
}

export const ROOM_TEMPERATURE = 298.15;

/**
 * Educational phase estimate from the recorded transitions, at normal pressure.
 * It does not model allotropes, pressure changes, or plasma. A missing transition
 * is never treated as zero; uncertain temperature intervals return "unknown".
 * The source's inverted arsenic transition pair is treated as sublimation.
 */
export function getPhaseAtTemperature(element: Element, kelvin: number): Phase {
	if (!Number.isFinite(kelvin) || kelvin < 0) return 'unknown';
	const { meltingPoint, boilingPoint } = element;
	if (boilingPoint !== null && kelvin >= boilingPoint) return 'gas';
	if (meltingPoint !== null && kelvin < meltingPoint) return 'solid';
	if (meltingPoint !== null && boilingPoint !== null && kelvin < boilingPoint) return 'liquid';
	if (kelvin === ROOM_TEMPERATURE || kelvin === 273.15) return element.phase;
	return 'unknown';
}

export function getTrendValue(element: Element, trend: TrendId): number | null {
	return element[trend];
}

const trendRanges = Object.fromEntries(
	trendDefinitions.map(({ id }) => {
		const trend = id;
		const values = elements
			.map((element) => getTrendValue(element, trend))
			.filter((value): value is number => value !== null);
		return [id, { min: Math.min(...values), max: Math.max(...values) }];
	})
) as Record<TrendId, { min: number; max: number }>;

export function getTrendRange(trend: TrendId): { min: number; max: number } {
	return { ...trendRanges[trend] };
}

/** Missing measurements remain null so the UI can distinguish them from zero. */
export function normalizeTrendValue(element: Element, trend: TrendId): number | null {
	const value = getTrendValue(element, trend);
	if (value === null) return null;
	const { min, max } = getTrendRange(trend);
	if (max === min) return 0.5;
	const ratio = (value - min) / (max - min);
	return Math.max(0, Math.min(1, ratio));
}

export function formatTrendValue(element: Element, trend: TrendId): string {
	const value = getTrendValue(element, trend);
	return formatNumber(value, {
		locale: 'en',
		maximumFractionDigits: value !== null && value < 0.01 && value > 0 ? 7 : 3,
		missing: 'Unknown'
	});
}

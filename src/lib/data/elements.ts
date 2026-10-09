import records from './element-records.json';

/** A family follows the original app's classification, including its f-block rows. */
export type CategoryId =
	| 'alkali-metal'
	| 'alkaline-earth-metal'
	| 'transition-metal'
	| 'post-transition-metal'
	| 'metalloid'
	| 'nonmetal'
	| 'halogen'
	| 'noble-gas'
	| 'lanthanide'
	| 'actinide';

export type Phase = 'solid' | 'liquid' | 'gas' | 'unknown';

export interface Element {
	number: number;
	name: string;
	symbol: string;
	/** Standard atomic weight, or the source's representative isotope mass number. */
	atomicMass: number;
	category: CategoryId;
	period: number;
	/** The detached f-block has no assigned group in this table convention. */
	group: number | null;
	/** One-based column in the 18-column table. */
	xpos: number;
	/** Periods 1–7; detached lanthanides and actinides use rows 9 and 10. */
	ypos: number;
	summary: string;
	electronConfiguration: string;
	shells: number[];
	phase: Phase;
	/** Transition temperatures in kelvin. Missing measurements remain null. */
	meltingPoint: number | null;
	boilingPoint: number | null;
	/** All densities are in g/cm³, including gases. */
	density: number | null;
	/** Pauling scale. */
	electronegativity: number | null;
	/** First ionization energy, kJ/mol. */
	ionizationEnergy: number | null;
	/** Source atomic (covalent) radius, pm. */
	atomicRadius: number | null;
	/** Electron affinity as energy released on electron attachment, kJ/mol. */
	electronAffinity: number | null;
	vanDerWaalsRadius: number | null;
	discoveredBy: string | null;
	yearDiscovered: string | null;
	source: string;
	appearance: string | null;
	molarHeat: number | null;
	bondingType: string | null;
	oxidationStates: string | null;
}

export interface Category {
	id: CategoryId;
	label: string;
	color: string;
	background: string;
	colorVariable: string;
	backgroundVariable: string;
	description: string;
}

const categoryDescriptions: Array<[CategoryId, string, string]> = [
	['alkali-metal', 'Alkali metals', 'Reactive metals in group 1, with one outer-shell electron.'],
	[
		'alkaline-earth-metal',
		'Alkaline earth metals',
		'Group 2 metals with two outer-shell electrons.'
	],
	[
		'transition-metal',
		'Transition metals',
		'The central d-block metals, often with several oxidation states.'
	],
	[
		'post-transition-metal',
		'Post-transition metals',
		'Metals in the p-block, beyond the transition metals.'
	],
	['metalloid', 'Metalloids', 'Elements with properties between those of metals and nonmetals.'],
	['nonmetal', 'Nonmetals', 'Nonmetal elements outside the halogen and noble-gas families.'],
	['halogen', 'Halogens', 'Group 17 elements, with seven outer-shell electrons.'],
	['noble-gas', 'Noble gases', 'Group 18 elements, with filled outer electron shells.'],
	['lanthanide', 'Lanthanides', 'Elements 57–71, displayed in the first detached row.'],
	['actinide', 'Actinides', 'Elements 89–103, displayed in the second detached row.']
];

export const categories: Category[] = categoryDescriptions.map(([id, label, description]) => ({
	id,
	label,
	description,
	color: `var(--category-${id})`,
	background: `var(--category-${id}-bg)`,
	colorVariable: `--category-${id}`,
	backgroundVariable: `--category-${id}-bg`
}));

export const categoryById = Object.fromEntries(
	categories.map((category) => [category.id, category])
) as Record<CategoryId, Category>;

/** Preserve the explicitly curated family assignments from the legacy components. */
function getCategory(number: number, groupBlock: string): CategoryId {
	if (number >= 57 && number <= 71) return 'lanthanide';
	if (number >= 89 && number <= 103) return 'actinide';
	if (number === 84) return 'metalloid';
	if ([13, 31, 49, 50, 81, 82, 83, 113, 114, 115, 116].includes(number))
		return 'post-transition-metal';
	if ([9, 17, 35, 53, 85, 117].includes(number)) return 'halogen';
	if ([2, 10, 18, 36, 54, 86, 118].includes(number)) return 'noble-gas';
	return groupBlock.replaceAll(' ', '-') as CategoryId;
}

function numberOrNull(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: unknown): string | null {
	return value === '' || value === null || value === undefined ? null : String(value);
}

/** Reproduce src/elements.js corrections without retaining the npm runtime dependency. */
const electronAffinityZero = new Set([2, 4, 10, 12, 18, 25, 30, 36, 48, 54, 72, 80, 86]);
const electronegativityCorrections: Record<number, number> = {
	20: 1,
	36: 3,
	54: 2.6,
	80: 2,
	84: 2
};

export const elements: Element[] = records.map(({ general, properties }) => {
	const number = general.number;
	const detached = (number >= 57 && number <= 71) || (number >= 89 && number <= 103);
	const atomicMass = Array.isArray(properties.atomicMass)
		? properties.atomicMass[0]
		: Number(Number.parseFloat(properties.atomicMass).toFixed(3));
	const electronAttachmentEnthalpy = numberOrNull(properties.electronAffinity);
	const electronAffinity = electronAffinityZero.has(number)
		? 0
		: electronAttachmentEnthalpy === null || electronAttachmentEnthalpy === 0
			? electronAttachmentEnthalpy
			: -electronAttachmentEnthalpy;

	return {
		number,
		name: properties.name,
		symbol: properties.symbol,
		atomicMass,
		category: getCategory(number, properties.groupBlock),
		period: general.period,
		group: detached ? null : general.xpos,
		xpos: general.xpos,
		ypos: general.ypos,
		summary: general.summary,
		electronConfiguration: properties.electronicConfiguration,
		shells: [...general.shells],
		phase: ['solid', 'liquid', 'gas'].includes(properties.standardState)
			? (properties.standardState as Phase)
			: 'unknown',
		meltingPoint: number === 87 ? 300 : numberOrNull(properties.meltingPoint),
		boilingPoint: numberOrNull(properties.boilingPoint),
		density: numberOrNull(properties.density),
		electronegativity:
			electronegativityCorrections[number] ?? numberOrNull(properties.electronegativity),
		ionizationEnergy: numberOrNull(properties.ionizationEnergy),
		atomicRadius: numberOrNull(properties.atomicRadius),
		electronAffinity,
		vanDerWaalsRadius: numberOrNull(properties.vanDelWaalsRadius),
		discoveredBy: general.discovered_by,
		yearDiscovered: textOrNull(properties.yearDiscovered),
		source: general.source,
		appearance: general.appearance,
		molarHeat: general.molar_heat,
		bondingType: textOrNull(properties.bondingType),
		oxidationStates: textOrNull(properties.oxidationStates)
	};
});

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

export type TrendId =
	| 'ionizationEnergy'
	| 'electronegativity'
	| 'atomicRadius'
	| 'electronAffinity'
	| 'density'
	| 'meltingPoint'
	| 'atomicMass';

export interface TrendDefinition {
	id: TrendId;
	label: string;
	unit: string;
	description: string;
	color: string;
}

export const trendDefinitions: TrendDefinition[] = [
	{
		id: 'electronegativity',
		label: 'Electronegativity',
		unit: 'Pauling scale',
		description: 'How strongly an atom attracts electrons in a chemical bond.',
		color: 'var(--trend-electronegativity)'
	},
	{
		id: 'atomicRadius',
		label: 'Atomic radius',
		unit: 'pm',
		description: 'The source’s covalent radius, an estimate of atomic size.',
		color: 'var(--trend-atomic-radius)'
	},
	{
		id: 'ionizationEnergy',
		label: 'Ionization energy',
		unit: 'kJ/mol',
		description: 'Energy needed to remove the first electron from a gaseous atom.',
		color: 'var(--trend-ionization-energy)'
	},
	{
		id: 'electronAffinity',
		label: 'Electron affinity',
		unit: 'kJ/mol',
		description:
			'Energy released when a gaseous atom gains an electron. Higher values mean more energy released.',
		color: 'var(--trend-electron-affinity)'
	},
	{
		id: 'density',
		label: 'Density',
		unit: 'g/cm³',
		description: 'Mass per unit volume at the source’s standard conditions.',
		color: 'var(--trend-density)'
	},
	{
		id: 'meltingPoint',
		label: 'Melting point',
		unit: 'K',
		description: 'Recorded transition temperature from solid to liquid; some elements sublime.',
		color: 'var(--trend-melting-point)'
	},
	{
		id: 'atomicMass',
		label: 'Atomic mass',
		unit: 'u',
		description: 'Standard atomic weight or a representative isotope mass number.',
		color: 'var(--trend-atomic-mass)'
	}
];

export const trends = trendDefinitions;
export const trendById = Object.fromEntries(
	trendDefinitions.map((trend) => [trend.id, trend])
) as Record<TrendId, TrendDefinition>;

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
	if (value === null) return 'Unknown';
	return new Intl.NumberFormat('en', {
		maximumFractionDigits: value < 0.01 && value > 0 ? 7 : 3
	}).format(value);
}

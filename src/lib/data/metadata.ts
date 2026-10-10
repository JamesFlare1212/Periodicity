import type { CategoryId } from './types.js';

export interface Category {
	id: CategoryId;
	label: string;
	color: string;
	background: string;
}

const categoryLabels: Array<[CategoryId, string]> = [
	['alkali-metal', 'Alkali metals'],
	['alkaline-earth-metal', 'Alkaline earth metals'],
	['transition-metal', 'Transition metals'],
	['post-transition-metal', 'Post-transition metals'],
	['metalloid', 'Metalloids'],
	['nonmetal', 'Nonmetals'],
	['halogen', 'Halogens'],
	['noble-gas', 'Noble gases'],
	['lanthanide', 'Lanthanides'],
	['actinide', 'Actinides']
];

export const categories: Category[] = categoryLabels.map(([id, label]) => ({
	id,
	label,
	color: `var(--category-${id})`,
	background: `var(--category-${id}-bg)`
}));

export const categoryById = Object.fromEntries(
	categories.map((category) => [category.id, category])
) as Record<CategoryId, Category>;

export function getCategoryLabel(category: string): string {
	return Object.hasOwn(categoryById, category)
		? categoryById[category as CategoryId].label
		: category;
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

/** The six measured properties offered by trend exploration and element detail. */
export const availableTrends = trendDefinitions.filter((trend) => trend.id !== 'atomicMass');

export const trendById = Object.fromEntries(
	trendDefinitions.map((trend) => [trend.id, trend])
) as Record<TrendId, TrendDefinition>;

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
}

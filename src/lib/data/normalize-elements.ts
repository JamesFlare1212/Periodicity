import type records from './element-records.json';
import type { CategoryId, Element, Phase } from './types.js';

type SourceElementRecord = (typeof records)[number];

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

/** Build-time conversion only; browser modules consume elements.generated.json. */
export function normalizeElementRecords(records: readonly SourceElementRecord[]): Element[] {
	return records.map(({ general, properties }) => {
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
			bondingType: textOrNull(properties.bondingType)
		};
	});
}

/** Stable field order, compact JSON and one trailing newline make regeneration reviewable. */
export function serializeElements(records: readonly SourceElementRecord[]): string {
	return `${JSON.stringify(normalizeElementRecords(records))}\n`;
}

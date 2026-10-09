import {
	categoryById,
	formatTrendValue,
	getPhaseAtTemperature,
	getTrendValue,
	normalizeTrendValue,
	ROOM_TEMPERATURE,
	trendById,
	type Element,
	type TrendId
} from './data/elements.js';

export type ElementDisplay = 'families' | 'phase' | TrendId;

export interface ElementDisplayPresentation {
	color: string;
	background: string;
	label: string;
	value: string;
	unit: string;
	unknown: boolean;
}

/** Keep table tiles and previews consistent with the active color mode. */
export function getElementDisplay(
	element: Element,
	display: ElementDisplay,
	temperature = ROOM_TEMPERATURE
): ElementDisplayPresentation {
	if (display === 'families') {
		const category = categoryById[element.category];
		return {
			color: category.color,
			background: category.background,
			label: 'Element family',
			value: category.label,
			unit: '',
			unknown: false
		};
	}

	if (display === 'phase') {
		const phase = getPhaseAtTemperature(element, temperature);
		const color = `var(--phase-${phase})`;
		return {
			color,
			background: `color-mix(in srgb, ${color} 12%, var(--surface))`,
			label: `State at ${Math.round(temperature)} K`,
			value: phase,
			unit: '',
			unknown: phase === 'unknown'
		};
	}

	const definition = trendById[display];
	const value = getTrendValue(element, display);
	const unknown = value === null;
	const color = 'var(--text)';
	let background = 'var(--surface)';
	const intensity = normalizeTrendValue(element, display);
	if (intensity !== null && !(display === 'electronAffinity' && value === 0)) {
		const tint = display === 'electronAffinity' ? definition.color : 'var(--accent)';
		background = `color-mix(in srgb, ${tint} ${intensity * 30}%, var(--surface))`;
	}
	return {
		color,
		background,
		label: definition.label,
		value: formatTrendValue(element, display),
		unit: unknown ? '' : definition.unit,
		unknown
	};
}

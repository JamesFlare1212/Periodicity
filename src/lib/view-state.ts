import { availableTrends, categories, trendDefinitions, type TrendId } from './data/metadata.js';
import type { CategoryId } from './data/types.js';

export type ExploreDisplay = 'families' | 'phase' | TrendId;
export type ConfigurationView = 'full' | 'short' | 'shell';
type ViewParameters = Pick<URLSearchParams, 'get' | 'getAll'>;

export const VIEW_DEFAULTS = {
	explore: {
		families: [] as readonly CategoryId[],
		display: 'families' as ExploreDisplay,
		temperature: 298,
		element: null as string | null
	},
	trends: {
		property: 'ionizationEnergy' as TrendId,
		view: 'chart' as 'chart' | 'table',
		period: 'all'
	},
	compare: { elements: [6, 14] as readonly number[] },
	calculator: { formula: 'H2O' },
	element: { configuration: 'full' as ConfigurationView }
};

export function readExploreView(parameters: ViewParameters) {
	const familyParameters = parameters.getAll('family');
	const requestedFamilies = familyParameters.length
		? familyParameters.flatMap((value) => value.split(','))
		: VIEW_DEFAULTS.explore.families;
	const requestedDisplay = parameters.get('display');
	const requestedTemperature = Number(
		parameters.get('temperature') ?? VIEW_DEFAULTS.explore.temperature
	);
	const identifier = parameters.get('element')?.trim();
	// Names and symbols remain supported without loading element records before first paint.
	const element = identifier
		? /^\d+$/.test(identifier)
			? Number(identifier) >= 1 && Number(identifier) <= 118
				? String(Number(identifier))
				: null
			: identifier
		: VIEW_DEFAULTS.explore.element;

	return {
		families: categories
			.filter((category) => requestedFamilies.includes(category.id))
			.map((category) => category.id),
		display:
			requestedDisplay === 'families' ||
			requestedDisplay === 'phase' ||
			trendDefinitions.some((trend) => trend.id === requestedDisplay)
				? (requestedDisplay as ExploreDisplay)
				: VIEW_DEFAULTS.explore.display,
		temperature: Number.isFinite(requestedTemperature)
			? Math.min(6000, Math.max(0, requestedTemperature))
			: VIEW_DEFAULTS.explore.temperature,
		element
	};
}

export function readTrendsView(parameters: ViewParameters) {
	const requestedProperty = parameters.get('property');
	const requestedPeriod = parameters.get('period');
	const requestedView = parameters.get('view');
	return {
		property: availableTrends.some((trend) => trend.id === requestedProperty)
			? (requestedProperty as TrendId)
			: VIEW_DEFAULTS.trends.property,
		view:
			requestedView === 'table' || requestedView === 'chart'
				? requestedView
				: VIEW_DEFAULTS.trends.view,
		period:
			requestedPeriod && /^[1-7]$/.test(requestedPeriod)
				? requestedPeriod
				: VIEW_DEFAULTS.trends.period
	};
}

export function readCompareView(parameters: ViewParameters) {
	const raw = parameters.get('elements');
	if (raw === null) return { elements: [...VIEW_DEFAULTS.compare.elements] };
	const elements: number[] = [];
	for (const identifier of raw.split(',')) {
		if (!/^\d+$/.test(identifier)) continue;
		const number = Number(identifier);
		if (number >= 1 && number <= 118 && !elements.includes(number)) elements.push(number);
		if (elements.length === 4) break;
	}
	return { elements };
}

export function readCalculatorView(parameters: ViewParameters) {
	return { formula: parameters.get('formula') ?? VIEW_DEFAULTS.calculator.formula };
}

export function normalizeConfigurationView(value: string | null): ConfigurationView {
	return value === 'full' || value === 'short' || value === 'shell'
		? value
		: VIEW_DEFAULTS.element.configuration;
}

export function readElementView(parameters: ViewParameters) {
	return { configuration: normalizeConfigurationView(parameters.get('configuration')) };
}

/** Only normalized, relevant route state can hide the ordinary prerendered view. */
export function needsInitialView(url: { pathname: string; searchParams: ViewParameters }): boolean {
	const path = url.pathname.replace(/\/$/, '') || '/';
	let requested: unknown;
	let initial: unknown;
	if (path === '/') {
		requested = readExploreView(url.searchParams);
		initial = VIEW_DEFAULTS.explore;
	} else if (path === '/trends') {
		requested = readTrendsView(url.searchParams);
		initial = VIEW_DEFAULTS.trends;
	} else if (path === '/compare') {
		requested = readCompareView(url.searchParams);
		initial = VIEW_DEFAULTS.compare;
	} else if (path === '/calculator') {
		requested = readCalculatorView(url.searchParams);
		initial = VIEW_DEFAULTS.calculator;
	} else if (/^\/element\/\d+$/.test(path)) {
		requested = readElementView(url.searchParams);
		initial = VIEW_DEFAULTS.element;
	} else {
		return false;
	}
	return JSON.stringify(requested) !== JSON.stringify(initial);
}

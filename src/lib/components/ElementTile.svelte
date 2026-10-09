<script lang="ts">
	import {
		formatTrendValue,
		getPhaseAtTemperature,
		normalizeTrendValue,
		trendDefinitions,
		type Element,
		type TrendId
	} from '#lib/data/elements.js';
	let {
		element,
		selected = false,
		dimmed = false,
		display = 'families',
		temperature = 298.15,
		onselect,
		onpreview,
		onleave
	}: {
		element: Element;
		selected?: boolean;
		dimmed?: boolean;
		display?: 'families' | 'phase' | TrendId;
		temperature?: number;
		onselect: (element: Element) => void;
		onpreview: (element: Element) => void;
		onleave: () => void;
	} = $props();
	let phase = $derived(getPhaseAtTemperature(element, temperature));
	let color = $derived(
		display === 'phase' ? `var(--phase-${phase})` : `var(--category-${element.category})`
	);
	let bottom = $derived(
		display === 'families'
			? String(element.atomicMass)
			: display === 'phase'
				? phase
				: formatTrendValue(element, display)
	);
	let isTrend = $derived(display !== 'families' && display !== 'phase');
	let definition = $derived(trendDefinitions.find((item) => item.id === display));
	let metric = $derived(
		display === 'families'
			? `Atomic mass ${element.atomicMass}`
			: display === 'phase'
				? `${phase} at ${temperature} kelvin`
				: `${definition?.label}: ${bottom} ${definition?.unit ?? ''}`
	);
	let heat = $derived(isTrend ? normalizeTrendValue(element, display as TrendId) : null);
	let tileColor = $derived(isTrend ? 'var(--text)' : color);
	let tileBg = $derived(
		isTrend
			? `color-mix(in srgb,var(--accent) ${(heat ?? 0) * 30}%,var(--surface))`
			: `var(--category-${element.category}-bg)`
	);
</script>

<button
	class="element-tile"
	class:selected
	class:dimmed
	style={`--tile-color:${tileColor};--tile-bg:${tileBg}`}
	aria-label={`${element.number}. ${element.name}, ${element.symbol}. ${metric}. Select element`}
	aria-pressed={selected}
	onclick={() => onselect(element)}
	onmouseenter={() => onpreview(element)}
	onmouseleave={onleave}
	onfocus={() => onpreview(element)}
	onblur={onleave}
	data-element={element.number}
>
	<span class="number">{element.number}</span><span class="symbol">{element.symbol}</span><span
		class="name">{element.name}</span
	><span class="value">{bottom}</span>
</button>

<style>
	.element-tile {
		height: 100%;
		width: 100%;
		min-width: 0;
		position: relative;
		border: 1px solid color-mix(in srgb, var(--tile-color) 18%, transparent);
		background: var(--tile-bg);
		color: var(--tile-color);
		border-radius: 5px;
		padding: 6px 3px 4px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		transition:
			opacity var(--motion-fast),
			border-color var(--motion-fast),
			background var(--motion-fast);
	}
	.element-tile:hover {
		border-color: var(--tile-color);
		background: color-mix(in srgb, var(--tile-color) 16%, var(--tile-bg));
		z-index: 2;
	}
	.element-tile.selected {
		border-color: var(--tile-color);
		box-shadow: inset 0 0 0 1px var(--tile-color);
	}
	.element-tile.dimmed {
		opacity: 0.18;
	}
	.element-tile.dimmed:focus-visible,
	.element-tile.dimmed:hover {
		opacity: 1;
	}
	.number {
		position: absolute;
		top: 4px;
		left: 6px;
		font-size: 10px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.symbol {
		font-family: var(--font-display);
		font-weight: 500;
		font-size: clamp(21px, 2vw, 29px);
		line-height: 1.05;
		margin-top: 4px;
		letter-spacing: -0.04em;
	}
	.name {
		font-size: clamp(8px, 0.72vw, 10px);
		margin-top: 3px;
		line-height: 1.1;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.value {
		font-size: clamp(8px, 0.67vw, 10px);
		line-height: 1.2;
		font-variant-numeric: tabular-nums;
		margin-top: 3px;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	@media (max-width: 760px) {
		.symbol {
			font-size: 28px;
		}
		.name {
			font-size: 11px;
		}
		.value {
			font-size: 10px;
		}
		.number {
			font-size: 11px;
		}
	}
</style>

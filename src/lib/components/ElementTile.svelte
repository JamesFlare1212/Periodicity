<script lang="ts">
	import { type Element } from '#lib/data/elements.js';
	import { getElementDisplay, type ElementDisplay } from '#lib/element-display.js';
	let {
		element,
		selected = false,
		dimmed = false,
		display = 'families',
		temperature = 298.15,
		onselect,
		onadd,
		onpreview,
		onleave
	}: {
		element: Element;
		selected?: boolean;
		dimmed?: boolean;
		display?: ElementDisplay;
		temperature?: number;
		onselect: (element: Element) => void;
		onadd?: (element: Element, trigger: HTMLButtonElement) => void;
		onpreview: (element: Element) => void;
		onleave: () => void;
	} = $props();
	let presentation = $derived(getElementDisplay(element, display, temperature));
	let bottom = $derived(display === 'families' ? String(element.atomicMass) : presentation.value);
	let metric = $derived(
		display === 'families'
			? `Atomic mass ${element.atomicMass}`
			: `${presentation.label}: ${bottom}${presentation.unit ? ` ${presentation.unit}` : ''}`
	);
</script>

<button
	class="element-tile"
	class:selected
	class:dimmed
	class:unknown={presentation.unknown}
	style={`--tile-color:${presentation.color};--tile-bg:${presentation.background}`}
	aria-label={`${element.number}. ${element.name}, ${element.symbol}. ${metric}. ${selected ? 'View element details' : 'Lock element preview'}${onadd ? '. Right-click or Shift+Enter to add to molar mass' : ''}`}
	aria-pressed={selected}
	aria-keyshortcuts={onadd ? 'Shift+Enter' : undefined}
	onclick={() => onselect(element)}
	oncontextmenu={(event) => {
		if (!onadd) return;
		event.preventDefault();
		onadd(element, event.currentTarget);
	}}
	onkeydown={(event) => {
		if (onadd && event.key === 'Enter' && event.shiftKey) {
			event.preventDefault();
			onadd(element, event.currentTarget);
		}
	}}
	onpointerenter={(event) => {
		if (event.pointerType === 'mouse') onpreview(element);
	}}
	onmouseleave={onleave}
	onfocus={(event) => {
		if (event.currentTarget.matches(':focus-visible')) onpreview(element);
	}}
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
		padding: 14px 3px 2px;
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
	.element-tile.unknown {
		opacity: 0.4;
	}
	.element-tile.dimmed {
		opacity: 0.18;
	}
	.element-tile.dimmed:focus-visible,
	.element-tile.dimmed:hover,
	.element-tile.unknown:focus-visible,
	.element-tile.unknown:hover {
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
		flex-shrink: 0;
		font-family: var(--font-display);
		font-weight: 500;
		font-size: clamp(21px, 2vw, 29px);
		line-height: 1.05;
		letter-spacing: -0.04em;
	}
	.name {
		flex-shrink: 0;
		font-size: clamp(8px, 0.72vw, 10px);
		margin-top: 3px;
		line-height: 1.4;
		max-width: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.value {
		flex-shrink: 0;
		font-size: clamp(8px, 0.67vw, 10px);
		line-height: 1.4;
		font-variant-numeric: tabular-nums;
		max-width: 100%;
		white-space: nowrap;
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

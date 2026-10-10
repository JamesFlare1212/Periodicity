<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { Element } from '#lib/data/elements.js';
	import Icon from './Icon.svelte';

	let {
		element,
		color,
		background,
		selected = false,
		dimmed = false,
		unknown = false,
		unavailable = false,
		value,
		selectionMark = false,
		...button
	}: {
		element: Element;
		color: string;
		background: string;
		selected?: boolean;
		dimmed?: boolean;
		unknown?: boolean;
		unavailable?: boolean;
		value?: string;
		selectionMark?: boolean;
	} & Omit<HTMLButtonAttributes, 'children' | 'class' | 'style'> = $props();
</script>

<button
	type="button"
	class="element-tile"
	class:selected
	class:dimmed
	class:unknown
	class:unavailable
	class:without-value={value === undefined}
	style:--tile-color={color}
	style:--tile-bg={background}
	data-element={element.number}
	aria-pressed={selected}
	aria-disabled={unavailable}
	{...button}
>
	<span class="number">{element.number}</span>
	{#if selected && selectionMark}<span class="selection-mark"><Icon name="check" size={12} /></span
		>{/if}
	<span class="symbol">{element.symbol}</span>
	<span class="name">{element.name}</span>
	{#if value !== undefined}<span class="value">{value}</span>{/if}
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
	.element-tile:hover:not(.unavailable) {
		border-color: var(--tile-color);
		background: color-mix(in srgb, var(--tile-color) 16%, var(--tile-bg));
		z-index: 2;
	}
	.element-tile.selected {
		border-color: var(--tile-color);
		box-shadow: inset 0 0 0 1px var(--tile-color);
	}
	.element-tile.unknown,
	.element-tile.unavailable {
		opacity: 0.4;
	}
	.element-tile.unavailable {
		cursor: not-allowed;
	}
	.element-tile.dimmed {
		opacity: 0.18;
	}
	.element-tile:focus-visible,
	.element-tile.dimmed:hover,
	.element-tile.unknown:hover {
		opacity: 1;
	}
	.element-tile:focus-visible {
		z-index: 2;
		outline-offset: 1px;
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
	.name,
	.value {
		flex-shrink: 0;
		line-height: 1.4;
		max-width: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.name {
		font-size: clamp(8px, 0.72vw, 10px);
		margin-top: 3px;
	}
	.value {
		font-size: clamp(8px, 0.67vw, 10px);
		font-variant-numeric: tabular-nums;
	}
	.without-value {
		padding-bottom: 4px;
	}
	.without-value .name {
		font-size: 9px;
		margin-top: 2px;
	}
	.selection-mark {
		position: absolute;
		top: 3px;
		right: 3px;
		display: grid;
		place-items: center;
		width: 15px;
		height: 15px;
		border-radius: 50%;
		background: var(--tile-color);
		color: var(--tile-bg);
	}
	@media (max-width: 1000px) {
		.without-value .name {
			font-size: 10px;
		}
	}
	@media (max-width: 760px) {
		.symbol {
			font-size: 28px;
		}
		.name,
		.without-value .name,
		.number {
			font-size: 11px;
		}
		.value {
			font-size: 10px;
		}
	}
</style>

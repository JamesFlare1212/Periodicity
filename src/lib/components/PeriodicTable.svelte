<script lang="ts">
	import type { Snippet } from 'svelte';
	import { elements, type Element, type CategoryId } from '#lib/data/elements.js';
	import { getElementNeighbor } from '#lib/ui/element-navigation.js';
	import Icon from './Icon.svelte';

	let {
		mobileView = 'grid',
		variant = 'explore',
		label,
		tile,
		content,
		mobileContent = false,
		contentHeight,
		matched,
		selectedFamilies = [],
		onfamily
	}: {
		mobileView?: 'grid' | 'table';
		variant?: 'explore' | 'picker';
		label: string;
		tile: Snippet<[Element]>;
		content?: Snippet;
		mobileContent?: boolean;
		contentHeight?: string;
		matched?: Set<number>;
		selectedFamilies?: CategoryId[];
		onfamily?: (category: CategoryId) => void;
	} = $props();
	let grid: HTMLDivElement;
	const series: {
		category: CategoryId;
		label: string;
		range: string;
		row: number;
		labelRow: number;
	}[] = [
		{ category: 'lanthanide', label: 'Lanthanides', range: '57–71', row: 7, labelRow: 10 },
		{ category: 'actinide', label: 'Actinides', range: '89–103', row: 8, labelRow: 11 }
	];

	export function focusElement(number: number) {
		grid?.querySelector<HTMLButtonElement>('[data-element="' + number + '"]')?.focus();
	}
	function navigate(event: KeyboardEvent, element: Element) {
		if (event.defaultPrevented) return;
		const style = getComputedStyle(grid);
		const layout = style.getPropertyValue('--table-layout').trim() === 'grid' ? 'grid' : 'table';
		const candidates =
			layout === 'grid' && matched ? elements.filter((item) => matched.has(item.number)) : elements;
		const next = getElementNeighbor(candidates, element, event.key, {
			layout,
			columns: style.gridTemplateColumns.split(' ').length,
			horizontal: variant === 'explore' ? 'atomic' : 'spatial',
			wholeTable: event.ctrlKey || (variant === 'explore' && layout === 'table')
		});
		if (next) {
			event.preventDefault();
			focusElement(next.number);
		}
	}
</script>

<div class="periodic-table" class:picker={variant === 'picker'}>
	{#if content}
		<div
			class="table-content"
			class:mobile-visible={mobileContent}
			class:bounded={contentHeight !== undefined}
			style:--preview-height={contentHeight}
		>
			{@render content()}
		</div>
	{/if}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (The labeled region supports keyboard scrolling.) -->
	<div
		class="table-scroll"
		class:mobile-table={mobileView === 'table'}
		role="region"
		aria-label={label}
		tabindex="0"
	>
		<div class="periodic-grid" bind:this={grid}>
			{#each Array.from({ length: 18 }, (_, index) => index + 1) as group}
				<span class="group-label" style:grid-column={group + 1} style:grid-row="1">{group}</span>
			{/each}
			{#each Array.from({ length: 7 }, (_, index) => index + 1) as period}
				<span class="period-label" style:grid-row={period + 1}>{period}</span>
			{/each}
			{#each elements as element (element.number)}
				<div
					class="tile-position"
					class:filtered={matched !== undefined && !matched.has(element.number)}
					style:--element-column={element.xpos + 1}
					style:--element-row={element.ypos + 1}
					onkeydown={(event) => navigate(event, element)}
					role="presentation"
				>
					{@render tile(element)}
				</div>
			{/each}
			{#each series as family}
				{#if onfamily}
					<button
						class="f-block-placeholder"
						style:grid-row={family.row}
						style:color={'var(--category-' + family.category + ')'}
						onclick={() => onfamily?.(family.category)}
						aria-label={'Filter ' +
							family.label.toLowerCase() +
							', elements ' +
							family.range.replace('–', ' to ')}
						aria-pressed={selectedFamilies.includes(family.category)}
					>
						<span>{family.range}</span><Icon name="chevron-down" size={16} />
					</button>
				{:else}
					<span
						class="f-block-placeholder"
						style:grid-row={family.row}
						style:color={'var(--category-' + family.category + ')'}
					>
						{family.range}<Icon name="chevron-down" size={14} />
					</span>
				{/if}
				<span class="f-block-label" style:grid-row={family.labelRow}>{family.label}</span>
			{/each}
		</div>
	</div>
</div>

<style>
	.periodic-table {
		--cell: clamp(73px, calc(6.1vw - 3px), 83px);
		--table-gap: 5px;
		--label-height: 23px;
		--detached-gap: 13px;
		--tile-width: calc((100% - 14px - 18 * var(--table-gap)) / 18);
		position: relative;
	}
	.picker {
		--cell: clamp(60px, 5vw, 70px);
		--table-gap: 4px;
		--label-height: 20px;
		--detached-gap: 10px;
		--table-min-width: 900px;
	}
	.table-content {
		position: absolute;
		z-index: 1;
		left: calc(14px + 3 * var(--table-gap) + 2 * var(--tile-width));
		top: calc(var(--label-height) + var(--table-gap));
		width: calc(10 * var(--tile-width) + 9 * var(--table-gap));
		height: calc(3 * var(--cell) + 2 * var(--table-gap));
		padding: 1px 12px 6px;
	}
	.picker .table-content {
		align-content: center;
		padding: 16px 24px;
	}
	.table-content.bounded {
		padding: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.table-scroll {
		overflow-x: auto;
		padding: 5px;
		margin: -5px;
		border-radius: 5px;
	}
	.periodic-grid {
		--table-layout: table;
		display: grid;
		grid-template-columns: 14px repeat(18, minmax(0, 1fr));
		grid-template-rows: var(--label-height) repeat(7, var(--cell)) var(--detached-gap) repeat(
				2,
				var(--cell)
			);
		gap: var(--table-gap);
		min-width: var(--table-min-width, 0px);
	}
	.group-label,
	.period-label {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
	}
	.period-label {
		grid-column: 1;
	}
	.tile-position {
		min-width: 0;
		min-height: 0;
		grid-column: var(--element-column);
		grid-row: var(--element-row);
	}
	.f-block-placeholder {
		grid-column: 4;
		min-width: 0;
		border: 1px dashed var(--border);
		border-radius: 5px;
		background: transparent;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 7px;
		font-size: 10px;
	}
	button.f-block-placeholder:hover {
		border-color: currentColor;
	}
	.f-block-label {
		grid-column: 2 / 4;
		align-self: center;
		justify-self: end;
		padding-right: 10px;
		font-size: 10px;
		color: var(--muted);
	}
	@media (min-width: 1001px) {
		.picker .table-content {
			display: grid;
		}
	}
	@media (max-width: 1000px) {
		.periodic-table {
			--cell: 83px;
			--table-gap: 5px;
		}
		.table-content {
			display: none;
		}
		.table-content.mobile-visible {
			display: block;
			position: static;
			width: auto;
			height: var(--preview-height, auto);
			padding: 0;
			margin-bottom: 10px;
			background: var(--surface);
			border: 1px solid var(--border);
			border-radius: var(--radius);
		}
		.periodic-grid {
			--table-layout: grid;
			min-width: 0;
			grid-template-columns: repeat(6, minmax(0, 1fr));
			grid-template-rows: none;
			grid-auto-rows: 91px;
			gap: 7px;
		}
		.tile-position {
			grid-column: auto;
			grid-row: auto;
		}
		.tile-position.filtered,
		.group-label,
		.period-label,
		.f-block-placeholder,
		.f-block-label {
			display: none;
		}
		.mobile-table {
			padding-bottom: 12px;
			scrollbar-color: var(--border) var(--surface);
		}
		.mobile-table .periodic-grid {
			--table-layout: table;
			width: 1120px;
			grid-template-columns: 14px repeat(18, minmax(0, 1fr));
			grid-template-rows: var(--label-height) repeat(7, var(--cell)) var(--detached-gap) repeat(
					2,
					var(--cell)
				);
			gap: var(--table-gap);
		}
		.mobile-table .tile-position {
			grid-column: var(--element-column);
			grid-row: var(--element-row);
		}
		.mobile-table .group-label,
		.mobile-table .period-label,
		.mobile-table .f-block-placeholder {
			display: flex;
		}
		.mobile-table .tile-position.filtered {
			display: block;
		}
		.mobile-table .f-block-label {
			display: block;
		}
	}
	@media (max-width: 600px) {
		.periodic-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>

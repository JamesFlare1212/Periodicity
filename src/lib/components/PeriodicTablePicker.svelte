<script lang="ts">
	import Icon from './Icon.svelte';
	import { elements, type Element } from '#lib/data/elements.js';

	let {
		selected,
		pending = false,
		limit = 4,
		onselect
	}: {
		selected: Element[];
		pending?: boolean;
		limit?: number;
		onselect: (element: Element) => void;
	} = $props();

	let table: HTMLDivElement;
	let focusedNumber = $state(1);
	let mobileView = $state<'grid' | 'table'>('grid');
	const selectedNumbers = $derived(new Set(selected.map((element) => element.number)));
	const full = $derived(selected.length >= limit);

	function arrowNavigate(event: KeyboardEvent, element: Element) {
		if (getComputedStyle(table).getPropertyValue('--picker-layout').trim() === 'grid') {
			const columns = getComputedStyle(table).gridTemplateColumns.split(' ').length;
			const index = elements.findIndex((item) => item.number === element.number);
			const rowStart = Math.floor(index / columns) * columns;
			const rowEnd = Math.min(rowStart + columns - 1, elements.length - 1);
			let nextIndex = index;
			switch (event.key) {
				case 'ArrowRight':
					nextIndex = Math.min(index + 1, rowEnd);
					break;
				case 'ArrowLeft':
					nextIndex = Math.max(index - 1, rowStart);
					break;
				case 'ArrowDown':
					if (index + columns < elements.length) nextIndex = index + columns;
					break;
				case 'ArrowUp':
					if (index >= columns) nextIndex = index - columns;
					break;
				case 'Home':
					nextIndex = event.ctrlKey ? 0 : rowStart;
					break;
				case 'End':
					nextIndex = event.ctrlKey ? elements.length - 1 : rowEnd;
					break;
				default:
					return;
			}
			event.preventDefault();
			table
				.querySelector<HTMLButtonElement>(`[data-element="${elements[nextIndex].number}"]`)
				?.focus();
			return;
		}
		let next: Element | undefined;
		switch (event.key) {
			case 'ArrowRight':
				next = elements
					.filter((item) => item.ypos === element.ypos && item.xpos > element.xpos)
					.sort((a, b) => a.xpos - b.xpos)[0];
				break;
			case 'ArrowLeft':
				next = elements
					.filter((item) => item.ypos === element.ypos && item.xpos < element.xpos)
					.sort((a, b) => b.xpos - a.xpos)[0];
				break;
			case 'ArrowDown':
				next = elements
					.filter((item) => item.xpos === element.xpos && item.ypos > element.ypos)
					.sort((a, b) => a.ypos - b.ypos)[0];
				break;
			case 'ArrowUp':
				next = elements
					.filter((item) => item.xpos === element.xpos && item.ypos < element.ypos)
					.sort((a, b) => b.ypos - a.ypos)[0];
				break;
			case 'Home':
				next = event.ctrlKey ? elements[0] : elements.find((item) => item.ypos === element.ypos);
				break;
			case 'End':
				next = event.ctrlKey
					? elements[elements.length - 1]
					: elements.findLast((item) => item.ypos === element.ypos);
				break;
			default:
				return;
		}
		event.preventDefault();
		if (next) table.querySelector<HTMLButtonElement>(`[data-element="${next.number}"]`)?.focus();
	}
</script>

<div class="periodic-picker" aria-busy={pending}>
	<div class="mobile-toolbar">
		{#if selected.length > 0}
			<a href="#properties-heading">View comparison<Icon name="chevron-down" size={16} /></a>
		{:else}
			<span>Choose up to {limit} elements.</span>
		{/if}
		<div class="mobile-view" role="group" aria-label="Element layout">
			<button
				type="button"
				class:active={mobileView === 'grid'}
				aria-label="Grid view"
				aria-pressed={mobileView === 'grid'}
				onclick={() => (mobileView = 'grid')}><Icon name="grid" size={17} /></button
			>
			<button
				type="button"
				class:active={mobileView === 'table'}
				aria-label="Periodic table view"
				aria-pressed={mobileView === 'table'}
				onclick={() => (mobileView = 'table')}><Icon name="table" size={17} /></button
			>
		</div>
	</div>
	<p class="scroll-hint" class:mobile-table={mobileView === 'table'}>
		<Icon name="arrow-right" size={15} /> Scroll to see all groups
	</p>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (The labeled region supports keyboard scrolling.) -->
	<div
		class="table-scroll"
		class:mobile-table={mobileView === 'table'}
		role="region"
		aria-label="Periodic table element selection"
		tabindex="0"
	>
		<div class="periodic-grid" bind:this={table}>
			{#each Array.from({ length: 18 }, (_, index) => index + 1) as group}
				<span class="group-label" style={`grid-column: ${group + 1}; grid-row: 1`}>{group}</span>
			{/each}
			{#each Array.from({ length: 7 }, (_, index) => index + 1) as period}
				<span class="period-label" style={`grid-row: ${period + 1}`}>{period}</span>
			{/each}

			<div class="table-help">
				<p>Choose up to {limit} elements.</p>
				<span>Arrow keys to move. Enter or Space to select.</span>
				{#if selected.length > 0}
					<a href="#properties-heading">View comparison<Icon name="chevron-down" size={16} /></a>
				{/if}
			</div>

			{#each elements as element (element.number)}
				{@const chosen = selectedNumbers.has(element.number)}
				{@const unavailable = pending || (full && !chosen)}
				<button
					type="button"
					class="element-tile"
					class:chosen
					class:unavailable
					style={`grid-column: ${element.xpos + 1}; grid-row: ${element.ypos + 1}; --element-color: var(--category-${element.category}); --element-bg: var(--category-${element.category}-bg)`}
					data-element={element.number}
					aria-label={`${element.number}. ${element.name}, ${element.symbol}. ${chosen ? 'Remove from comparison' : 'Add to comparison'}`}
					aria-pressed={chosen}
					aria-disabled={unavailable}
					aria-describedby="selection-instructions"
					tabindex={focusedNumber === element.number ? 0 : -1}
					onfocus={() => (focusedNumber = element.number)}
					onkeydown={(event) => arrowNavigate(event, element)}
					onclick={() => {
						if (!unavailable) onselect(element);
					}}
					title={`${element.name} (${element.symbol})${full && !chosen ? ' — remove an element to select this one' : ''}`}
				>
					<span class="atomic-number">{element.number}</span>
					{#if chosen}<span class="selection-mark"><Icon name="check" size={12} /></span>{/if}
					<strong class="element-symbol">{element.symbol}</strong>
					<span class="element-name">{element.name}</span>
				</button>
			{/each}

			<span class="f-block-placeholder lanthanides"
				>57–71<Icon name="chevron-down" size={14} /></span
			>
			<span class="f-block-placeholder actinides">89–103<Icon name="chevron-down" size={14} /></span
			>
			<span class="f-block-label lanthanide-label">Lanthanides</span>
			<span class="f-block-label actinide-label">Actinides</span>
		</div>
	</div>
</div>

<style>
	.table-scroll {
		overflow-x: auto;
		padding: 5px;
		margin: -5px;
		border-radius: 5px;
	}
	.periodic-grid {
		--picker-layout: table;
		--cell: clamp(60px, 5vw, 70px);
		display: grid;
		grid-template-columns: 14px repeat(18, minmax(0, 1fr));
		grid-template-rows: 20px repeat(7, var(--cell)) 10px repeat(2, var(--cell));
		gap: 4px;
		min-width: 900px;
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
	.table-help {
		grid-column: 4 / 14;
		grid-row: 2 / 5;
		align-self: center;
		padding: 16px 24px;
	}
	.table-help p {
		font-family: var(--font-display);
		font-size: 19px;
		letter-spacing: -0.035em;
	}
	.table-help > span {
		display: block;
		margin-top: 8px;
		color: var(--muted);
		font-size: 12px;
	}
	.table-help a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		margin-top: 6px;
		color: var(--accent);
		font-size: 13px;
	}
	.table-help a:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.element-tile {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-width: 0;
		padding: 14px 3px 4px;
		border: 1px solid color-mix(in srgb, var(--element-color) 22%, transparent);
		border-radius: 5px;
		background: var(--element-bg);
		color: var(--element-color);
		transition:
			background var(--motion-fast),
			border-color var(--motion-fast),
			opacity var(--motion-fast);
	}
	.element-tile:hover:not(.unavailable) {
		border-color: var(--element-color);
		background: color-mix(in srgb, var(--element-bg) 80%, var(--surface));
	}
	.element-tile.chosen {
		border-color: var(--element-color);
		box-shadow: inset 0 0 0 1px var(--element-color);
		background: color-mix(in srgb, var(--element-bg) 85%, var(--surface));
	}
	.element-tile.unavailable {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.element-tile:focus-visible {
		z-index: 1;
		opacity: 1;
		outline-offset: 1px;
	}
	.atomic-number {
		position: absolute;
		top: 5px;
		left: 5px;
		font-size: 10px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.selection-mark {
		position: absolute;
		top: 3px;
		right: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 15px;
		height: 15px;
		border-radius: 50%;
		background: var(--element-color);
		color: var(--element-bg);
	}
	.element-symbol {
		font-family: var(--font-display);
		font-size: clamp(22px, 2vw, 28px);
		font-weight: 500;
		line-height: 1.15;
		letter-spacing: -0.04em;
	}
	.element-name {
		max-width: 100%;
		margin-top: 2px;
		overflow: hidden;
		font-size: 9px;
		line-height: 1.4;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.f-block-placeholder {
		grid-column: 4;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		border: 1px dashed var(--border);
		border-radius: 5px;
		font-size: 10px;
	}
	.lanthanides {
		grid-row: 7;
		color: var(--category-lanthanide);
	}
	.actinides {
		grid-row: 8;
		color: var(--category-actinide);
	}
	.f-block-label {
		grid-column: 2 / 4;
		align-self: center;
		justify-self: end;
		padding-right: 6px;
		color: var(--muted);
		font-size: 10px;
	}
	.lanthanide-label {
		grid-row: 10;
	}
	.actinide-label {
		grid-row: 11;
	}
	.scroll-hint {
		display: none;
	}
	.mobile-toolbar {
		display: none;
	}
	@media (max-width: 1100px) {
		.scroll-hint {
			display: flex;
			align-items: center;
			gap: 6px;
			margin-bottom: 12px;
			color: var(--muted);
			font-size: 12px;
		}
	}
	@media (max-width: 1000px) {
		.mobile-toolbar {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			margin-bottom: 16px;
			color: var(--muted);
			font-size: 12px;
		}
		.mobile-toolbar > a {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			min-height: 44px;
			color: var(--accent);
		}
		.mobile-view {
			display: flex;
			flex-shrink: 0;
			padding: 2px;
			border: 1px solid var(--border);
			border-radius: 7px;
		}
		.mobile-view button {
			display: grid;
			place-items: center;
			width: 44px;
			height: 44px;
			border: 0;
			border-radius: 4px;
			background: transparent;
			color: var(--muted);
		}
		.mobile-view button.active {
			background: var(--accent-soft);
			color: var(--accent);
		}
		.scroll-hint:not(.mobile-table) {
			display: none;
		}
		.periodic-grid {
			--cell: 83px;
			width: 1120px;
			gap: 5px;
		}
		.table-scroll.mobile-table {
			padding-bottom: 12px;
			scrollbar-color: var(--border) var(--surface);
		}
		.table-scroll:not(.mobile-table) .periodic-grid {
			--picker-layout: grid;
			width: auto;
			min-width: 0;
			grid-template-columns: repeat(6, minmax(0, 1fr));
			grid-template-rows: none;
			grid-auto-rows: 91px;
			gap: 7px;
		}
		.table-scroll:not(.mobile-table) .element-tile {
			grid-column: auto !important;
			grid-row: auto !important;
		}
		.table-scroll:not(.mobile-table) .group-label,
		.table-scroll:not(.mobile-table) .period-label,
		.table-scroll:not(.mobile-table) .table-help,
		.table-scroll:not(.mobile-table) .f-block-placeholder,
		.table-scroll:not(.mobile-table) .f-block-label {
			display: none;
		}
		.element-name {
			font-size: 10px;
		}
	}
	@media (max-width: 760px) {
		.element-symbol {
			font-size: 28px;
		}
		.element-name,
		.atomic-number {
			font-size: 11px;
		}
	}
	@media (max-width: 600px) {
		.table-scroll:not(.mobile-table) .periodic-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>

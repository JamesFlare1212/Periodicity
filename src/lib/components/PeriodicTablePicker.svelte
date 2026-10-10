<script lang="ts">
	import Icon from './Icon.svelte';
	import LayoutSwitch from './LayoutSwitch.svelte';
	import ElementButton from './ElementButton.svelte';
	import PeriodicTable from './PeriodicTable.svelte';
	import { type Element } from '#lib/data/elements.js';

	let {
		selected,
		pending = false,
		limit = 4,
		descriptionId,
		comparisonHref,
		onselect
	}: {
		selected: Element[];
		pending?: boolean;
		limit?: number;
		descriptionId?: string;
		comparisonHref?: string;
		onselect: (element: Element) => void;
	} = $props();
	let table: PeriodicTable;
	let focusedNumber = $state(1);
	let mobileView = $state<'grid' | 'table'>('grid');
	const selectedNumbers = $derived(new Set(selected.map((element) => element.number)));
	const full = $derived(selected.length >= limit);

	export function focusElement(number: number) {
		table?.focusElement(number);
	}
</script>

<div class="periodic-picker" aria-busy={pending}>
	<div class="mobile-toolbar">
		{#if selected.length > 0 && comparisonHref}
			<a href={comparisonHref}>View comparison<Icon name="chevron-down" size={16} /></a>
		{:else}
			<span>Choose up to {limit} elements.</span>
		{/if}
		<LayoutSwitch value={mobileView} onchange={(value) => (mobileView = value)} />
	</div>
	<p class="scroll-hint" class:mobile-table={mobileView === 'table'}>
		<Icon name="arrow-right" size={15} /> Scroll to see all groups
	</p>
	<PeriodicTable
		bind:this={table}
		{mobileView}
		variant="picker"
		label="Periodic table element selection"
	>
		{#snippet content()}
			<div class="table-help">
				<p>Choose up to {limit} elements.</p>
				<span>Arrow keys to move. Enter or Space to select.</span>
				{#if selected.length > 0 && comparisonHref}
					<a href={comparisonHref}>View comparison<Icon name="chevron-down" size={16} /></a>
				{/if}
			</div>
		{/snippet}
		{#snippet tile(element)}
			{@const chosen = selectedNumbers.has(element.number)}
			{@const unavailable = pending || (full && !chosen)}
			<ElementButton
				{element}
				selected={chosen}
				{unavailable}
				selectionMark
				color={'var(--category-' + element.category + ')'}
				background={'var(--category-' + element.category + '-bg)'}
				aria-label={element.number +
					'. ' +
					element.name +
					', ' +
					element.symbol +
					'. ' +
					(chosen ? 'Remove from comparison' : 'Add to comparison')}
				aria-describedby={descriptionId}
				tabindex={focusedNumber === element.number ? 0 : -1}
				onfocus={() => (focusedNumber = element.number)}
				onclick={() => {
					if (!unavailable) onselect(element);
				}}
				title={element.name +
					' (' +
					element.symbol +
					')' +
					(full && !chosen ? ' — remove an element to select this one' : '')}
			/>
		{/snippet}
	</PeriodicTable>
</div>

<style>
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
	.table-help a,
	.mobile-toolbar > a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		color: var(--accent);
	}
	.table-help a {
		margin-top: 6px;
		font-size: 13px;
	}
	.table-help a:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.scroll-hint,
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
		.scroll-hint:not(.mobile-table) {
			display: none;
		}
	}
</style>

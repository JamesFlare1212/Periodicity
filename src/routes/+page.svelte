<script lang="ts">
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import {
		categories,
		elements,
		getElement,
		getPhaseAtTemperature,
		trendDefinitions,
		type Element,
		type CategoryId,
		type TrendId
	} from '#lib/data/elements.js';
	import ElementTile from '#lib/components/ElementTile.svelte';
	import ElementPreview from '#lib/components/ElementPreview.svelte';
	import ElectronConfigurationDialog from '#lib/components/ElectronConfigurationDialog.svelte';
	import MassAddition from '#lib/components/MassAddition.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PeriodicTable from '#lib/components/PeriodicTable.svelte';
	import LayoutSwitch from '#lib/components/LayoutSwitch.svelte';
	import { VIEW_DEFAULTS, readExploreView } from '#lib/view-state.js';
	import { calculateElementSelection } from '#lib/chemistry/element-selection.js';

	const DEFAULT_TEMPERATURE = VIEW_DEFAULTS.explore.temperature;

	let selectedFamilies = $state<CategoryId[]>([...VIEW_DEFAULTS.explore.families]);
	let display = $state<'families' | 'phase' | TrendId>(VIEW_DEFAULTS.explore.display);
	let temperature = $state(DEFAULT_TEMPERATURE);
	let selected = $state<Element | null>(getElement(VIEW_DEFAULTS.explore.element ?? '') ?? null);
	let hovered = $state<Element | null>(null);
	let configurationElement = $state<Element | null>(null);
	let mobileView = $state<'grid' | 'table'>('grid');
	let massSelection = $state<Element[]>([]);
	let massAddButton: HTMLButtonElement;
	let massTrigger: HTMLButtonElement | undefined;
	let massResult = $derived(calculateElementSelection(massSelection));
	let massAnnouncement = $derived(
		massResult
			? `${massResult.formula}: ${Number(massResult.totalMass.toFixed(3))} grams per mole, ${massResult.totalAtoms} ${massResult.totalAtoms === 1 ? 'atom' : 'atoms'}.`
			: ''
	);
	let effectiveUrl = $derived(page.shallow?.url ?? page.url);
	let preview = $derived(selected ?? hovered ?? getElement(6)!);
	let matches = $derived(
		elements.filter(
			(element) => selectedFamilies.length === 0 || selectedFamilies.includes(element.category)
		)
	);
	let matchedNumbers = $derived(new Set(matches.map((element) => element.number)));
	let phaseCounts = $derived(
		elements.reduce(
			(counts, element) => {
				counts[getPhaseAtTemperature(element, temperature)]++;
				return counts;
			},
			{ solid: 0, liquid: 0, gas: 0, unknown: 0 }
		)
	);
	let isTrend = $derived(display !== 'families' && display !== 'phase');
	let trend = $derived(trendDefinitions.find((item) => item.id === display));

	$effect(() => {
		if (!browser) return;
		const view = readExploreView(effectiveUrl.searchParams);
		selectedFamilies = view.families;
		display = view.display;
		temperature = view.temperature;
		selected = getElement(view.element ?? '') ?? null;
	});
	function update(params: Record<string, string | null>) {
		const url = new URL(effectiveUrl.href);
		for (const [key, value] of Object.entries(params))
			value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
		void goto(url, { shallow: true, replace: true, reset: false });
	}
	function selectElement(element: Element) {
		if (selected?.number === element.number) {
			void goto(`/element/${element.number}/`);
			return;
		}
		selected = element;
		hovered = null;
		update({ element: String(element.number) });
	}
	function openConfiguration(element: Element) {
		selected = element;
		hovered = null;
		configurationElement = element;
		update({ element: String(element.number) });
	}
	function filterFamily(id: CategoryId) {
		selectedFamilies = selectedFamilies.includes(id)
			? selectedFamilies.filter((family) => family !== id)
			: [...selectedFamilies, id];
		update({ family: selectedFamilies.join(',') || null });
	}
	function addToMass(element: Element, trigger: HTMLButtonElement) {
		massSelection = [...massSelection, element];
		massTrigger = trigger;
	}
	async function closeMass() {
		massSelection = [];
		await tick();
		const target =
			massTrigger?.isConnected && massTrigger.getClientRects().length ? massTrigger : massAddButton;
		target?.focus({ preventScroll: true });
	}
	function undoMass() {
		if (massSelection.length === 1) {
			void closeMass();
			return;
		}
		massSelection = massSelection.slice(0, -1);
	}
	function reset() {
		selectedFamilies = [];
		update({ family: null });
	}
	function changeDisplay(value: typeof display) {
		display = value;
		update({ display: value === 'families' ? null : value });
	}
	function changeTemperature(value: string) {
		temperature = Math.min(6000, Math.max(0, Number(value) || 0));
		display = 'phase';
		update({ temperature: String(temperature), display: 'phase' });
		return temperature;
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (configurationElement) return;
		if (!event.defaultPrevented && event.key === 'Escape' && massSelection.length > 0) {
			event.preventDefault();
			void closeMass();
		}
	}}
/>
<svelte:head><title>Periodicity — An atlas of the elements</title></svelte:head>
<div class="page-shell explore-page">
	<p class="sr-only" role="status">{massAnnouncement}</p>
	<div class="page-intro">
		<div>
			<h1 class="page-heading">The periodic table.</h1>
			<p class="page-description">Meet the elements that make everything.</p>
		</div>
		<div class="heading-note">
			<span class="live-dot"></span><span>118 elements. Endless discoveries.</span>
		</div>
	</div>
	<div class="table-toolbar">
		<div class="toolbar-controls">
			<div class="display-field">
				<label for="display">Color by</label><select
					id="display"
					value={display}
					onchange={(event) => changeDisplay(event.currentTarget.value as typeof display)}
					><option value="families">Element family</option><option value="phase"
						>Physical state</option
					>{#each trendDefinitions as item}<option value={item.id}>{item.label}</option
						>{/each}</select
				>
			</div>
			<button
				type="button"
				class="button quick-mass-add"
				bind:this={massAddButton}
				aria-label={`Add ${preview.symbol} to mass, ${preview.name}`}
				title="Add the previewed element, or right-click any element tile"
				onclick={(event) => addToMass(preview, event.currentTarget)}
				><Icon name="plus" size={17} />Add {preview.symbol} to mass</button
			>
			<div class="mobile-view">
				<LayoutSwitch value={mobileView} onchange={(value) => (mobileView = value)} />
			</div>
		</div>
		<div
			class="temperature-panel"
			class:inactive={display !== 'phase'}
			inert={display !== 'phase'}
			aria-hidden={display !== 'phase'}
		>
			<div class="temperature-control">
				<label for="temperature-range">Temperature</label>
				<input
					id="temperature-range"
					type="range"
					min="0"
					max="6000"
					step="1"
					value={temperature}
					aria-valuetext={`${temperature} kelvin`}
					oninput={(event) => changeTemperature(event.currentTarget.value)}
				/>
				<div class="temperature-value">
					<label class="sr-only" for="temperature-value">Temperature in kelvin</label>
					<input
						id="temperature-value"
						type="number"
						min="0"
						max="6000"
						step="1"
						value={temperature}
						oninput={(event) => {
							event.currentTarget.value = String(changeTemperature(event.currentTarget.value));
						}}
					/>
					<span aria-hidden="true">K</span>
				</div>
				<button
					type="button"
					class="icon-button temperature-reset"
					aria-label={`Reset temperature to ${DEFAULT_TEMPERATURE} K`}
					title={`Reset temperature to ${DEFAULT_TEMPERATURE} K`}
					onclick={() => changeTemperature(String(DEFAULT_TEMPERATURE))}
					><Icon name="reset" size={17} /></button
				>
			</div>
			<div class="phase-counts">
				{#each ['solid', 'liquid', 'gas', 'unknown'] as state}<span
						style={`--phase-color:var(--phase-${state})`}
						><i></i>{state} <b>{phaseCounts[state as keyof typeof phaseCounts]}</b></span
					>{/each}
			</div>
		</div>
	</div>
	<div class="mobile-family-filter">
		<label for="mobile-family">Family</label><select
			id="mobile-family"
			value="summary"
			onchange={(event) => {
				if (event.currentTarget.value) filterFamily(event.currentTarget.value as CategoryId);
				else reset();
				event.currentTarget.value = 'summary';
			}}
			><option value="summary" disabled
				>{selectedFamilies.length === 0
					? 'All element families'
					: `${selectedFamilies.length} ${selectedFamilies.length === 1 ? 'family' : 'families'} selected`}</option
			><option value="">Reset filters</option>{#each categories as family}<option value={family.id}
					>{selectedFamilies.includes(family.id) ? '✓ ' : ''}{family.label}</option
				>{/each}</select
		>
	</div>
	<div class="table-caption">
		{#if isTrend && trend}
			<span class="table-caption-right"
				>{trend.label}
				<span
					class="heatmap-key"
					style={`--heatmap-color:${display === 'electronAffinity' ? trend.color : 'var(--accent)'}`}
				>
					{#if display === 'electronAffinity'}0{/if}<i aria-hidden="true"></i>
					{display === 'electronAffinity' ? 'More energy released' : 'Low to high'}
				</span>
			</span>
		{/if}
	</div>
	<div class="periodic-workspace">
		<PeriodicTable
			{mobileView}
			label="Periodic table, horizontally scrollable on small screens"
			matched={matchedNumbers}
			{selectedFamilies}
			onfamily={filterFamily}
			mobileContent
			contentHeight={massResult ? 'var(--mass-preview-height)' : undefined}
		>
			{#snippet content()}
				{#if massResult}
					<MassAddition
						selection={massSelection}
						result={massResult}
						onundo={undoMass}
						onclose={closeMass}
						embedded
					/>
				{:else}
					<ElementPreview
						element={preview}
						{display}
						{temperature}
						onconfiguration={openConfiguration}
					/>
				{/if}
			{/snippet}
			{#snippet tile(element)}
				<ElementTile
					{element}
					selected={selected?.number === element.number}
					dimmed={!matchedNumbers.has(element.number)}
					{display}
					{temperature}
					onselect={selectElement}
					onadd={addToMass}
					onpreview={(element) => (hovered = element)}
					onleave={() => {
						if (
							document.activeElement instanceof HTMLElement &&
							document.activeElement.dataset.element === String(element.number)
						)
							return;
						if (hovered?.number === element.number) hovered = null;
					}}
				/>
			{/snippet}
		</PeriodicTable>
	</div>
	<div class="legend-wrap">
		<div class="legend-heading">
			<span>Element families</span>{#if selectedFamilies.length > 0}<button
					class="reset-filter"
					onclick={reset}><Icon name="reset" size={13} />Reset filters</button
				>{:else}<span class="legend-tip">Select families to highlight; click again to deselect</span
				>{/if}
		</div>
		<div class="family-legend" aria-label="Filter by element family">
			{#each categories as family}<button
					class:active={selectedFamilies.includes(family.id)}
					class:muted={selectedFamilies.length > 0 && !selectedFamilies.includes(family.id)}
					style={`--family-color:${family.color}`}
					aria-pressed={selectedFamilies.includes(family.id)}
					onclick={() => filterFamily(family.id)}
					><span class="family-marker" aria-hidden="true"><Icon name="check" size={11} /></span
					>{family.label}</button
				>{/each}
		</div>
	</div>
	<div class="explore-bottom">
		<div>
			<span class="sample-cell">6 <b>C</b></span>
			<p>
				<b>A world inside every square.</b><span
					>Click to lock an element. Right-click or Shift+Enter to add to mass.</span
				>
			</p>
		</div>
		<a href="/trends/">Discover the patterns <Icon name="arrow-right" size={17} /></a>
	</div>
</div>

{#if configurationElement}
	<ElectronConfigurationDialog
		element={configurationElement}
		onclose={() => (configurationElement = null)}
	/>
{/if}

<style>
	.explore-page {
		--mass-preview-height: 240px;
		padding-bottom: 30px;
	}
	.heading-note {
		font-size: 12px;
		color: var(--muted);
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.live-dot {
		width: 6px;
		height: 6px;
		background: var(--accent);
		border-radius: 50%;
	}
	.table-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border);
	}
	.toolbar-controls {
		display: flex;
		gap: 12px;
		align-items: center;
	}
	.display-field {
		display: flex;
		gap: 12px;
		align-items: center;
	}
	.quick-mass-add {
		white-space: nowrap;
		width: 170px;
		flex: 0 0 170px;
		padding-inline: 12px;
	}
	.display-field label {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
	}
	.display-field select {
		font-size: 16px;
		font-weight: 600;
		min-width: 220px;
		min-height: 48px;
		padding: 10px 14px;
		border: 2px solid var(--accent);
		background: var(--accent-soft);
		transition: background var(--motion-fast);
	}
	.display-field select:hover {
		background: var(--surface-raised);
	}
	.mobile-view {
		display: none;
	}
	.temperature-panel {
		flex: 0 1 960px;
		min-width: 0;
		margin-left: auto;
		padding: 4px 12px;
		display: grid;
		grid-template-columns: minmax(240px, 1fr) auto;
		gap: 4px 12px;
		align-items: center;
	}
	.temperature-panel.inactive {
		visibility: hidden;
	}
	.temperature-control {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}
	.temperature-control label {
		font-size: 12px;
		white-space: nowrap;
	}
	.temperature-value {
		position: relative;
		flex-shrink: 0;
	}
	.temperature-reset {
		flex-shrink: 0;
		color: var(--text);
	}
	.temperature-value span {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--muted);
		font-size: 12px;
		pointer-events: none;
	}
	.temperature-control input[type='range'] {
		flex: 1;
		width: 120px;
		min-width: 70px;
		max-width: 240px;
		margin: 0;
		padding: 0;
		accent-color: var(--accent);
		border: 0;
	}
	.temperature-control input[type='number'] {
		width: 100px;
		padding-left: 8px;
		padding-right: 28px;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}
	.temperature-control input[type='number']::-webkit-inner-spin-button {
		opacity: 1;
		cursor: pointer;
	}
	.phase-counts {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
		font-size: 12px;
	}
	.phase-counts span {
		display: flex;
		gap: 6px;
		align-items: center;
		white-space: nowrap;
		text-transform: capitalize;
		color: var(--phase-color);
	}
	.phase-counts i {
		width: 5px;
		height: 5px;
		background: currentColor;
		border-radius: 50%;
	}
	.phase-counts b {
		font-weight: 400;
		min-width: 3ch;
		font-variant-numeric: tabular-nums;
	}
	.table-caption {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 16px;
		margin: 16px 0 8px;
		color: var(--muted);
		font-size: 11px;
		min-height: 1.5em;
	}
	.table-caption-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.heatmap-key {
		display: flex;
		gap: 5px;
		align-items: center;
	}
	.heatmap-key i {
		display: block;
		width: 48px;
		height: 5px;
		background: linear-gradient(90deg, var(--surface), var(--heatmap-color, var(--accent)));
		border-radius: 2px;
	}
	.legend-wrap {
		margin-top: 24px;
		padding: 17px 20px 19px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 9px;
	}
	.legend-heading {
		display: flex;
		justify-content: space-between;
		color: var(--text);
		font-size: 11px;
		margin-bottom: 9px;
		min-height: 44px;
		align-items: center;
	}
	.legend-tip {
		color: var(--muted);
	}
	.family-legend {
		display: flex;
		flex-wrap: wrap;
		column-gap: 16px;
		row-gap: 4px;
	}
	.family-legend button {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 2px;
		min-height: 44px;
		background: transparent;
		border: 0;
		color: var(--family-color);
		font-size: 11px;
		font-weight: 500;
		transition: opacity var(--motion-fast);
	}
	.family-marker {
		width: 13px;
		height: 13px;
		flex-shrink: 0;
		display: grid;
		place-items: center;
		border-radius: 2px;
		background: currentColor;
	}
	.family-marker :global(svg) {
		color: var(--bg);
		visibility: hidden;
	}
	.family-legend button.active .family-marker :global(svg) {
		visibility: visible;
	}
	.family-legend button.muted {
		opacity: 0.5;
	}
	.family-legend button:hover {
		opacity: 1;
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.reset-filter {
		min-height: 44px;
		color: var(--accent);
		border: 0;
		background: transparent;
		padding: 0;
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
	}
	.explore-bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 24px 2px 0;
	}
	.explore-bottom > div {
		display: flex;
		gap: 12px;
		align-items: center;
	}
	.sample-cell {
		font-size: 8px;
		height: 36px;
		width: 32px;
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 2px 5px;
		color: var(--muted);
	}
	.sample-cell b {
		font-family: var(--font-display);
		display: block;
		text-align: center;
		font-size: 15px;
		line-height: 1.1;
		color: var(--text);
	}
	.explore-bottom p {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 11px;
	}
	.explore-bottom p b {
		font-weight: 500;
	}
	.explore-bottom p span {
		color: var(--muted);
	}
	.explore-bottom > a {
		color: var(--accent);
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		min-height: 44px;
	}
	.mobile-family-filter {
		display: none;
	}
	@media (max-width: 1200px) {
		.temperature-panel {
			grid-template-columns: minmax(0, 1fr);
		}
		.phase-counts {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 1000px) {
		.heading-note {
			display: none;
		}
		.periodic-workspace {
			margin-top: 16px;
		}
		.table-toolbar {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}
		.temperature-panel {
			flex: none;
			margin-left: 0;
		}
		.temperature-panel.inactive {
			display: none;
		}
		.toolbar-controls {
			width: 100%;
			gap: 8px;
			align-items: flex-end;
		}
		.display-field {
			flex: 1;
			min-width: 0;
			flex-direction: column;
			align-items: stretch;
			gap: 6px;
		}
		.display-field select {
			width: 100%;
			min-width: 0;
		}
		.mobile-view {
			display: block;
		}
		.mobile-family-filter {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-top: 16px;
		}
		.mobile-family-filter label {
			font-size: 12px;
			color: var(--muted);
		}
		.mobile-family-filter select {
			flex: 1;
			min-width: 0;
			font-size: 14px;
		}
		.table-caption {
			display: none;
		}
		.legend-wrap {
			margin-top: 20px;
			padding: 14px;
		}
		.family-legend {
			gap: 0 16px;
		}
		.family-legend button {
			font-size: 12px;
		}
		.legend-tip {
			display: none;
		}
		.explore-bottom {
			align-items: flex-start;
			gap: 12px;
		}
		.explore-bottom > a {
			max-width: 120px;
			font-size: 11px;
		}
	}

	@media (max-width: 760px) {
		.explore-page {
			--mass-preview-height: 340px;
		}
	}
	@media (max-width: 360px) {
		.explore-page {
			--mass-preview-height: 384px;
		}
	}

	@media (max-width: 600px) {
		.toolbar-controls {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: center;
		}
		.display-field {
			grid-column: 1 / -1;
		}
		.quick-mass-add {
			width: 100%;
		}
		.temperature-panel {
			padding: 4px 12px 8px;
		}
		.temperature-control input[type='number'] {
			width: 108px;
			font-size: 16px;
		}
		.phase-counts {
			gap: 4px 12px;
			font-size: 11px;
		}
	}
</style>

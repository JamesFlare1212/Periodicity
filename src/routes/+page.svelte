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
		normalizeTrendValue,
		type Element,
		type CategoryId,
		type TrendId
	} from '#lib/data/elements.js';
	import ElementTile from '#lib/components/ElementTile.svelte';
	import ElementPreview from '#lib/components/ElementPreview.svelte';
	import ElectronConfigurationDialog from '#lib/components/ElectronConfigurationDialog.svelte';
	import MassAddition from '#lib/components/MassAddition.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { calculateElementSelection } from '#lib/chemistry/element-selection.js';

	let selectedFamilies = $state<CategoryId[]>([]);
	let display = $state<'families' | 'phase' | TrendId>('families');
	let temperature = $state(298);
	let selected = $state<Element | null>(null);
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
		const params = effectiveUrl.searchParams;
		const families = params.getAll('family').flatMap((value) => value.split(','));
		selectedFamilies = categories
			.filter((family) => families.includes(family.id))
			.map((family) => family.id);
		const d = params.get('display');
		display =
			d === 'phase' || trendDefinitions.some((item) => item.id === d)
				? (d as typeof display)
				: 'families';
		const t = Number(params.get('temperature') ?? 298);
		temperature = Number.isFinite(t) ? Math.min(6000, Math.max(0, t)) : 298;
		selected = getElement(params.get('element') ?? '') ?? null;
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
	}
	function arrowNavigate(event: KeyboardEvent, element: Element) {
		let next: Element | undefined;
		if (event.key === 'ArrowRight') next = getElement(Math.min(118, element.number + 1));
		if (event.key === 'ArrowLeft') next = getElement(Math.max(1, element.number - 1));
		if (event.key === 'ArrowDown')
			next = elements
				.filter((e) => e.xpos === element.xpos && e.ypos > element.ypos)
				.sort((a, b) => a.ypos - b.ypos)[0];
		if (event.key === 'ArrowUp')
			next = elements
				.filter((e) => e.xpos === element.xpos && e.ypos < element.ypos)
				.sort((a, b) => b.ypos - a.ypos)[0];
		if (event.key === 'Home') next = getElement(1);
		if (event.key === 'End') next = getElement(118);
		if (next) {
			event.preventDefault();
			document
				.querySelector<HTMLButtonElement>(`.periodic-grid [data-element="${next.number}"]`)
				?.focus();
			hovered = next;
		}
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
	<div class="explore-heading">
		<div>
			<h1 class="page-heading">The periodic table.</h1>
			<p>Meet the elements that make everything.</p>
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
			<div class="mobile-view" aria-label="Element layout">
				<button
					class:active={mobileView === 'grid'}
					aria-label="Grid view"
					aria-pressed={mobileView === 'grid'}
					onclick={() => (mobileView = 'grid')}><Icon name="grid" size={17} /></button
				><button
					class:active={mobileView === 'table'}
					aria-label="Periodic table view"
					aria-pressed={mobileView === 'table'}
					onclick={() => (mobileView = 'table')}><Icon name="table" size={17} /></button
				>
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
						value={temperature}
						onchange={(event) => changeTemperature(event.currentTarget.value)}
					/>
					<span aria-hidden="true">K</span>
				</div>
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
	<div class="mobile-preview" class:panel={!massResult}>
		{#if massResult}
			<MassAddition
				selection={massSelection}
				result={massResult}
				onundo={undoMass}
				onclose={closeMass}
			/>
		{:else}
			<ElementPreview
				element={preview}
				{display}
				{temperature}
				onconfiguration={openConfiguration}
			/>
		{/if}
	</div>
	{#if isTrend && trend}
		<div class="table-caption">
			<span class="table-caption-right" class:affinity={display === 'electronAffinity'}
				>{trend.label}
				<span
					class="heatmap-key"
					style={`--heatmap-color:${display === 'electronAffinity' ? trend.color : 'var(--accent)'}`}
				>
					{#if display === 'electronAffinity'}0{/if}<i aria-hidden="true"></i>
					{display === 'electronAffinity' ? 'More energy released' : 'Low to high'}
				</span>
			</span>
		</div>
	{/if}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (The labeled table scroll region supports keyboard scrolling.) -->
	<div
		class="table-scroll"
		class:mobile-table={mobileView === 'table'}
		role="region"
		aria-label="Periodic table, horizontally scrollable on small screens"
		tabindex={mobileView === 'table' ? 0 : undefined}
	>
		<div class="periodic-grid">
			{#each Array.from({ length: 18 }, (_, index) => index + 1) as group}<span
					class="group-label"
					style={`grid-column:${group + 1};grid-row:1`}>{group}</span
				>{/each}
			<span class="group-caption">Group</span>
			{#each Array.from({ length: 7 }, (_, index) => index + 1) as period}<span
					class="period-label"
					style={`grid-row:${period + 1}`}>{period}</span
				>{/each}
			<div class="table-preview">
				{#if massResult}
					<MassAddition
						selection={massSelection}
						result={massResult}
						onundo={undoMass}
						onclose={closeMass}
					/>
				{:else}
					<ElementPreview
						element={preview}
						{display}
						{temperature}
						onconfiguration={openConfiguration}
					/>
				{/if}
			</div>
			{#each elements as element}<div
					class="tile-position"
					style={`grid-column:${element.xpos + 1};grid-row:${element.ypos + 1};--heat:${isTrend ? (normalizeTrendValue(element, display as TrendId) ?? 0) : 0}`}
					onkeydown={(event) => arrowNavigate(event, element)}
					role="presentation"
					class:heatmap={isTrend}
				>
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
				</div>{/each}
			<button
				class="f-block-placeholder lanthanides"
				onclick={() => filterFamily('lanthanide')}
				aria-label="Filter lanthanides, elements 57 to 71"
				aria-pressed={selectedFamilies.includes('lanthanide')}
				><span>57–71</span><Icon name="chevron-down" size={16} /></button
			>
			<button
				class="f-block-placeholder actinides"
				onclick={() => filterFamily('actinide')}
				aria-label="Filter actinides, elements 89 to 103"
				aria-pressed={selectedFamilies.includes('actinide')}
				><span>89–103</span><Icon name="chevron-down" size={16} /></button
			>
			<span class="f-block-label lanthanide-label">Lanthanides</span><span
				class="f-block-label actinide-label">Actinides</span
			>
		</div>
	</div>
	<div class="mobile-element-grid" class:hidden={mobileView === 'table'}>
		{#each matches as element}<ElementTile
				{element}
				selected={selected?.number === element.number}
				{display}
				{temperature}
				onselect={selectElement}
				onadd={addToMass}
				onpreview={() => {}}
				onleave={() => {}}
			/>{/each}
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
					><i></i>{family.label}{#if selectedFamilies.includes(family.id)}<Icon
							name="check"
							size={13}
						/>{/if}</button
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
		padding-top: 34px;
		padding-bottom: 30px;
	}
	.explore-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 24px;
		margin-bottom: 29px;
	}
	.explore-heading h1 {
		font-size: clamp(30px, 3vw, 41px);
	}
	.explore-heading p {
		margin-top: 8px;
		font-size: 14px;
		color: var(--muted);
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
		width: 76px;
		padding-left: 8px;
		padding-right: 28px;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		appearance: textfield;
	}
	.temperature-control input[type='number']::-webkit-inner-spin-button,
	.temperature-control input[type='number']::-webkit-outer-spin-button {
		appearance: none;
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
	}
	.table-scroll {
		margin-top: 16px;
	}
	.table-caption + .table-scroll {
		margin-top: 0;
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
	.periodic-grid {
		--cell: clamp(73px, calc(6.1vw - 3px), 83px);
		display: grid;
		grid-template-columns: 14px repeat(18, minmax(0, 1fr));
		grid-template-rows: 23px repeat(7, var(--cell)) 13px repeat(2, var(--cell));
		gap: 5px;
	}
	.group-label,
	.period-label {
		font-size: 10px;
		color: var(--muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.group-caption {
		display: none;
	}
	.period-label {
		grid-column: 1;
	}
	.table-preview {
		grid-column: 4 / 14;
		grid-row: 2 / 5;
		align-self: stretch;
		padding: 1px 12px 6px;
	}
	.tile-position {
		min-width: 0;
		min-height: 0;
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
	.f-block-placeholder:hover {
		border-color: currentColor;
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
		padding-right: 10px;
		font-size: 10px;
		color: var(--muted);
	}
	.lanthanide-label {
		grid-row: 10;
	}
	.actinide-label {
		grid-row: 11;
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
		min-height: 30px;
		background: transparent;
		border: 0;
		color: var(--family-color);
		font-size: 11px;
		transition: opacity var(--motion-fast);
	}
	.family-legend button i {
		width: 7px;
		height: 7px;
		border-radius: 2px;
		background: currentColor;
	}
	.family-legend button.active {
		font-weight: 600;
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
	.mobile-element-grid,
	.mobile-preview,
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
		.table-caption-right.affinity {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
		}
		.heading-note {
			display: none;
		}
		.table-toolbar {
			gap: 12px;
		}
		.periodic-grid {
			--cell: 73px;
			gap: 4px;
		}
		.table-preview {
			padding: 0 0 0 4px;
		}
		.family-legend {
			column-gap: 12px;
		}
	}
	@media (max-width: 1000px) {
		.explore-heading {
			margin-bottom: 22px;
		}
		.table-toolbar {
			flex-direction: column;
			align-items: stretch;
			padding-bottom: 16px;
			gap: 12px;
		}
		.temperature-panel {
			flex: none;
			margin-left: 0;
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
			display: flex;
			border: 1px solid var(--border);
			border-radius: 7px;
			padding: 2px;
		}
		.mobile-view button {
			width: 44px;
			height: 44px;
			display: grid;
			place-items: center;
			background: transparent;
			border: 0;
			color: var(--muted);
			border-radius: 4px;
		}
		.mobile-view button.active {
			color: var(--accent);
			background: var(--accent-soft);
		}
		.mobile-preview {
			display: block;
			margin-top: 16px;
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
		.table-scroll {
			display: none;
		}
		.table-scroll.mobile-table {
			display: block;
			overflow-x: auto;
			padding: 0 0 12px;
			scrollbar-color: var(--border) var(--surface);
		}
		.periodic-grid {
			width: 1120px;
			--cell: 83px;
			gap: 5px;
		}
		.table-preview {
			display: none;
		}
		.mobile-element-grid {
			display: grid;
			grid-template-columns: repeat(6, minmax(0, 1fr));
			grid-auto-rows: 91px;
			gap: 7px;
			margin-top: 10px;
		}
		.mobile-element-grid.hidden {
			display: none;
		}
		.table-caption {
			display: none;
		}
		.table-caption + .table-scroll {
			margin-top: 16px;
		}
		.table-caption-right,
		.table-caption-right.affinity {
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
			min-height: 44px;
			font-size: 12px;
		}
		.legend-tip {
			display: none;
		}
		.reset-filter {
			min-height: 30px;
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

	@media (max-width: 600px) {
		.toolbar-controls {
			flex-wrap: wrap;
		}
		.display-field {
			flex-basis: 220px;
		}
		.mobile-view {
			margin-left: auto;
		}
		.temperature-panel {
			grid-template-columns: minmax(0, 1fr);
			padding: 4px 12px 8px;
		}
		.temperature-control {
			gap: 8px;
		}
		.temperature-control input[type='number'] {
			width: 84px;
			font-size: 16px;
		}
		.phase-counts {
			gap: 4px 12px;
			font-size: 11px;
		}
		.mobile-element-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>

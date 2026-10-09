<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { categories, getElement, searchElements, type Element } from '#lib/data/elements.js';

	let query = $state('');
	let candidate = $state('');
	let pending = $state(false);
	let notice = $state('');
	let searchInput: HTMLInputElement;
	const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });

	function readSelection(raw: string | null): Element[] {
		if (raw === null) return [getElement(6)!, getElement(14)!];
		const chosen: Element[] = [];
		for (const identifier of raw.split(',')) {
			if (!/^\d+$/.test(identifier)) continue;
			const element = getElement(Number(identifier));
			if (element && !chosen.some((selected) => selected.number === element.number))
				chosen.push(element);
			if (chosen.length === 4) break;
		}
		return chosen;
	}

	const effectiveUrl = $derived(page.shallow?.url ?? page.url);
	const selected = $derived(
		readSelection(browser ? effectiveUrl.searchParams.get('elements') : null)
	);
	const available = $derived(
		searchElements(query).filter(
			(element) => !selected.some((chosen) => chosen.number === element.number)
		)
	);

	function categoryLabel(category: string) {
		return categories.find((item) => item.id === category)?.label ?? category;
	}

	function numeric(value: number | null | undefined, unit = '') {
		if (value == null || !Number.isFinite(value)) return 'Not available';
		const formatted =
			value !== 0 && Math.abs(value) < 0.01
				? new Intl.NumberFormat('en-US', { maximumFractionDigits: 7 }).format(value)
				: number.format(value);
		return `${formatted}${unit ? ` ${unit}` : ''}`;
	}

	const sections: {
		title: string;
		rows: { label: string; value: (element: Element) => string }[];
	}[] = [
		{
			title: 'At a glance',
			rows: [
				{ label: 'Atomic number', value: (element) => String(element.number) },
				{ label: 'Atomic mass', value: (element) => numeric(element.atomicMass, 'u') },
				{ label: 'Element family', value: (element) => categoryLabel(element.category) },
				{ label: 'Period', value: (element) => String(element.period) },
				{ label: 'Group', value: (element) => numeric(element.group) },
				{ label: 'State at room temperature', value: (element) => element.phase || 'Not available' }
			]
		},
		{
			title: 'Atomic structure',
			rows: [
				{
					label: 'Electron configuration',
					value: (element) => element.electronConfiguration || 'Not available'
				},
				{
					label: 'Electrons per shell',
					value: (element) => element.shells?.join(', ') || 'Not available'
				},
				{
					label: 'Electronegativity',
					value: (element) => numeric(element.electronegativity, '(Pauling)')
				},
				{
					label: 'First ionization energy',
					value: (element) => numeric(element.ionizationEnergy, 'kJ/mol')
				},
				{
					label: 'Electron affinity',
					value: (element) => numeric(element.electronAffinity, 'kJ/mol')
				},
				{ label: 'Atomic radius', value: (element) => numeric(element.atomicRadius, 'pm') }
			]
		},
		{
			title: 'Physical properties',
			rows: [
				{ label: 'Density', value: (element) => numeric(element.density, 'g/cm³') },
				{ label: 'Melting point', value: (element) => numeric(element.meltingPoint, 'K') },
				{ label: 'Boiling point', value: (element) => numeric(element.boilingPoint, 'K') },
				{
					label: 'Molar heat capacity',
					value: (element) => numeric(element.molarHeat, 'J/(mol·K)')
				},
				{ label: 'Bonding type', value: (element) => element.bondingType || 'Not available' }
			]
		}
	];

	async function setSelection(next: Element[], message: string) {
		if (pending) return;
		pending = true;
		try {
			const url = new URL(effectiveUrl.href);
			url.searchParams.set('elements', next.map((element) => element.number).join(','));
			await goto(url, { shallow: true, replace: true, reset: false });
			notice = message;
		} catch {
			notice = 'The comparison could not be updated. Try adding the element again.';
		} finally {
			pending = false;
		}
	}

	async function addElement(event: SubmitEvent) {
		event.preventDefault();
		const element = getElement(Number(candidate));
		if (
			!element ||
			selected.length >= 4 ||
			selected.some((chosen) => chosen.number === element.number)
		)
			return;
		await setSelection(
			[...selected, element],
			`Added ${element.name}. ${selected.length + 1} elements selected.`
		);
		candidate = '';
		query = '';
	}

	async function removeElement(element: Element) {
		const next = selected.filter((chosen) => chosen.number !== element.number);
		await setSelection(next, `Removed ${element.name}. ${next.length} elements selected.`);
		await tick();
		searchInput?.focus();
	}

	function preset(identifiers: number[]) {
		const next = identifiers.map((identifier) => getElement(identifier)!).filter(Boolean);
		void setSelection(next, `Comparing ${next.map((element) => element.name).join(', ')}.`);
	}
</script>

<svelte:head>
	<title>Compare elements | Periodicity</title>
	<meta
		name="description"
		content="Compare up to four chemical elements side by side, from atomic structure to melting points and density."
	/>
</svelte:head>

<div class="page-shell compare-page">
	<header class="tool-header">
		<div>
			<h1 class="page-heading">Compare elements</h1>
			<p class="text-muted">Look closer at what elements share, and what sets them apart.</p>
		</div>
		<a class="button" href="/"> <Icon name="table" size={18} /> Periodic table </a>
	</header>

	<section class="selection-panel panel" aria-labelledby="selection-heading">
		<div class="selection-heading">
			<h2 id="selection-heading">Your comparison</h2>
			<span class="selection-count">{selected.length} of 4 elements</span>
		</div>

		{#if selected.length > 0}
			<div class="selected-elements" style={`--columns: ${Math.max(2, selected.length)}`}>
				{#each selected as element (element.number)}
					<div
						class="selected-element"
						style={`--element-color: var(--category-${element.category}); --element-bg: var(--category-${element.category}-bg)`}
					>
						<div class="element-topline">
							<span class="atomic-number">{element.number}</span>
							<button
								class="icon-button"
								type="button"
								aria-label={`Remove ${element.name} from comparison`}
								onclick={() => removeElement(element)}
								disabled={pending}
							>
								<Icon name="close" size={16} />
							</button>
						</div>
						<a class="element-link" href={`/element/${element.number}/`}>
							<strong class="element-symbol">{element.symbol}</strong>
							<span class="element-name">{element.name}</span>
						</a>
						<span class="element-category">{categoryLabel(element.category)}</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-selection">
				<Icon name="table" size={28} />
				<p>Add your first element below to begin a comparison.</p>
			</div>
		{/if}

		<form class="add-element-form" onsubmit={addElement}>
			<div class="search-field">
				<label for="compare-search">Find an element</label>
				<div class="search-input-wrap">
					<Icon name="search" size={18} />
					<input
						id="compare-search"
						type="search"
						bind:this={searchInput}
						bind:value={query}
						oninput={() => (candidate = '')}
						placeholder="Name, symbol, or atomic number"
						disabled={selected.length >= 4 || pending}
						autocomplete="off"
					/>
				</div>
			</div>
			<div class="select-field">
				<label for="compare-element">Element to add</label>
				<select
					id="compare-element"
					bind:value={candidate}
					disabled={selected.length >= 4 || pending || available.length === 0}
				>
					<option value=""
						>{available.length === 0 ? 'No matching elements' : 'Choose an element'}</option
					>
					{#each available as element}
						<option value={element.number}
							>{element.number}. {element.name} ({element.symbol})</option
						>
					{/each}
				</select>
			</div>
			<button
				class="button button-primary add-button"
				type="submit"
				disabled={!candidate || selected.length >= 4 || pending}
			>
				<Icon name="plus" size={18} />
				{pending ? 'Updating…' : 'Add element'}
			</button>
		</form>
		<div class="selection-footer">
			<p class="text-muted">
				{selected.length >= 4
					? 'Comparison is full. Remove an element to add another.'
					: 'Choose up to four elements. Your selection is saved in this page’s link.'}
			</p>
			<div class="presets" aria-label="Suggested comparisons">
				<span>Try</span>
				<button type="button" onclick={() => preset([6, 14, 32, 50])} disabled={pending}
					>Carbon’s group</button
				>
				<button type="button" onclick={() => preset([1, 6, 7, 8])} disabled={pending}
					>Elements of life</button
				>
			</div>
		</div>
		<p class="sr-only" role="status">{notice}</p>
	</section>

	{#if selected.length > 0}
		<section class="property-comparison" aria-labelledby="properties-heading">
			<div class="properties-heading">
				<h2 id="properties-heading">Side by side</h2>
				<p class="text-muted">
					{selected.length === 1
						? 'Add another element to see how its properties compare.'
						: 'Same properties. Different possibilities.'}
				</p>
			</div>
			<div class="comparison-table-wrap panel">
				<table class="comparison-table" style={`--columns: ${selected.length}`}>
					<caption class="sr-only"
						>Properties of {selected.map((element) => element.name).join(', ')}</caption
					>
					<thead>
						<tr>
							<th scope="col">Property</th>
							{#each selected as element}
								<th scope="col" style={`color: var(--category-${element.category})`}
									><span class="table-symbol">{element.symbol}</span> {element.name}</th
								>
							{/each}
						</tr>
					</thead>
					{#each sections as section}
						<tbody>
							<tr class="section-row"
								><th colspan={selected.length + 1} scope="colgroup">{section.title}</th></tr
							>
							{#each section.rows as row}
								<tr class="property-row">
									<th scope="row">{row.label}</th>
									{#each selected as element}
										<td class:unavailable={row.value(element) === 'Not available'}>
											<span
												class="mobile-element-label"
												style={`color: var(--category-${element.category})`}>{element.symbol}</span
											>
											<span>{row.value(element)}</span>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					{/each}
					<tfoot
						><tr
							><th scope="row">Explore further</th>{#each selected as element}<td
									><a href={`/element/${element.number}/`}
										>View {element.name}<Icon name="arrow-right" size={16} /></a
									></td
								>{/each}</tr
						></tfoot
					>
				</table>
			</div>
			<p class="data-note text-muted">
				Temperatures are in kelvin. Missing measurements are shown as “Not available”; they are
				never treated as zero. Atomic masses for elements without stable isotopes use a
				representative isotope.
			</p>
		</section>
	{/if}
</div>

<style>
	.compare-page {
		padding-bottom: 64px;
	}
	.tool-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 32px;
	}
	.tool-header p {
		margin-top: 10px;
		font-size: 15px;
		line-height: 1.6;
	}
	.tool-header > .button {
		flex-shrink: 0;
		margin-top: 4px;
	}
	.selection-panel {
		padding: 28px;
	}
	.selection-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		margin-bottom: 22px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.03em;
	}
	.selection-count {
		color: var(--muted);
		font-size: 14px;
		font-variant-numeric: tabular-nums;
	}
	.selected-elements {
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		gap: 14px;
	}
	.selected-element {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 14px 20px 22px;
		border: 1px solid color-mix(in srgb, var(--element-color) 34%, var(--border));
		border-radius: 12px;
		background: var(--element-bg);
	}
	.element-topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 44px;
		gap: 8px;
	}
	.atomic-number {
		font-size: 15px;
		color: var(--element-color);
		font-variant-numeric: tabular-nums;
	}
	.element-topline .icon-button {
		color: var(--muted);
		min-width: 44px;
		min-height: 44px;
		margin-right: -10px;
	}
	.element-link {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		width: fit-content;
		max-width: 100%;
		color: var(--text);
		text-decoration: none;
		border-radius: 4px;
	}
	.element-link:hover .element-name {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.element-symbol {
		font-family: var(--font-display);
		color: var(--element-color);
		font-size: 58px;
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.05em;
	}
	.element-name {
		margin-top: 4px;
		font-size: 17px;
		font-weight: 500;
		overflow-wrap: anywhere;
	}
	.element-category {
		color: var(--muted);
		margin-top: 8px;
		font-size: 13px;
		line-height: 1.5;
	}
	.add-element-form {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) auto;
		gap: 16px;
		align-items: end;
		margin-top: 28px;
	}
	.add-element-form label {
		display: block;
		margin-bottom: 8px;
		font-size: 14px;
		font-weight: 500;
	}
	.search-input-wrap {
		position: relative;
	}
	.search-input-wrap :global(svg) {
		position: absolute;
		left: 15px;
		top: 16px;
		color: var(--muted);
		pointer-events: none;
	}
	input,
	select {
		height: 50px;
		width: 100%;
		min-width: 0;
		color: var(--text);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		font: inherit;
		font-size: 16px;
	}
	input {
		padding: 0 12px 0 44px;
	}
	select {
		padding: 0 36px 0 14px;
	}
	input::placeholder {
		color: var(--muted);
		font-size: 14px;
	}
	input:disabled,
	select:disabled {
		opacity: 0.55;
	}
	.add-button {
		height: 50px;
		white-space: nowrap;
	}
	.selection-footer {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px 20px;
		margin-top: 14px;
	}
	.selection-footer p {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
	}
	.presets {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 13px;
	}
	.presets span {
		color: var(--muted);
	}
	.presets button {
		min-height: 44px;
		padding: 0 10px;
		color: var(--accent);
		background: transparent;
		border: 0;
		border-radius: 6px;
		font: inherit;
		cursor: pointer;
	}
	.presets button:hover {
		background: var(--surface-raised);
	}
	.empty-selection {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		min-height: 148px;
		background: var(--bg);
		border: 1px dashed var(--border);
		border-radius: 8px;
		padding: 20px;
		color: var(--muted);
	}
	.empty-selection p {
		margin: 0;
		max-width: 40ch;
		line-height: 1.6;
	}
	.property-comparison {
		margin-top: 36px;
	}
	.properties-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 18px;
	}
	.properties-heading p {
		font-size: 14px;
		margin: 0;
	}
	.comparison-table-wrap {
		overflow: hidden;
	}
	.comparison-table {
		border-collapse: collapse;
		width: 100%;
		table-layout: fixed;
		font-size: 14px;
	}
	.comparison-table th,
	.comparison-table td {
		padding: 18px 22px;
		text-align: left;
		vertical-align: middle;
		overflow-wrap: anywhere;
	}
	.comparison-table th:first-child {
		width: 230px;
	}
	.comparison-table thead th {
		padding-top: 22px;
		padding-bottom: 22px;
		font-weight: 500;
		font-size: 14px;
		background: var(--surface-raised);
	}
	.comparison-table thead th:first-child {
		color: var(--muted);
		font-weight: 400;
	}
	.table-symbol {
		display: inline-block;
		margin-right: 8px;
		font-family: var(--font-display);
		font-size: 20px;
		font-weight: 600;
	}
	.section-row th {
		width: auto !important;
		color: var(--text);
		font-weight: 600;
		font-size: 14px;
		padding-top: 22px;
		padding-bottom: 16px;
		border-top: 1px solid var(--border);
		background: color-mix(in srgb, var(--surface-raised) 45%, var(--surface));
	}
	.property-row th {
		color: var(--muted);
		font-weight: 400;
	}
	.property-row th,
	.property-row td {
		border-bottom: 1px solid var(--border);
		line-height: 1.5;
	}
	.property-row td {
		font-variant-numeric: tabular-nums;
	}
	.property-row:hover {
		background: var(--surface-raised);
	}
	.unavailable {
		color: var(--muted);
		font-size: 13px;
	}
	.mobile-element-label {
		display: none;
	}
	tfoot th {
		color: var(--muted);
		font-weight: 400;
	}
	tfoot a {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		min-height: 44px;
		color: var(--accent);
		text-decoration: none;
	}
	tfoot a:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.data-note {
		margin: 16px 0 0;
		max-width: 90ch;
		font-size: 13px;
		line-height: 1.7;
	}
	input:focus-visible,
	select:focus-visible,
	button:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}
	@media (max-width: 1100px) {
		.selection-footer {
			display: block;
		}
		.presets {
			margin-top: 5px;
		}
		.comparison-table th:first-child {
			width: 195px;
		}
		.comparison-table th,
		.comparison-table td {
			padding-left: 16px;
			padding-right: 16px;
		}
		.comparison-table thead th {
			font-size: 13px;
		}
		.table-symbol {
			display: block;
			margin-right: 0;
			margin-bottom: 4px;
		}
	}
	@media (max-width: 760px) {
		.selection-panel {
			padding: 20px;
		}
		.selected-elements {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 10px;
		}
		.selected-element {
			padding: 8px 14px 16px;
		}
		.element-symbol {
			font-size: 48px;
		}
		.element-name {
			font-size: 16px;
		}
		.element-category {
			font-size: 12px;
		}
		.add-element-form {
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 14px 12px;
		}
		.search-field {
			grid-column: 1 / -1;
		}
		.add-button {
			padding-left: 14px;
			padding-right: 14px;
		}
		.properties-heading {
			display: block;
		}
		.properties-heading p {
			margin-top: 8px;
			line-height: 1.6;
		}
		.comparison-table,
		.comparison-table tbody,
		.comparison-table tfoot {
			display: block;
		}
		.comparison-table thead {
			display: none;
		}
		.comparison-table tr {
			display: grid;
			grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
			padding: 14px 18px;
		}
		.comparison-table th,
		.comparison-table td {
			width: auto !important;
			padding: 0;
		}
		.comparison-table .section-row {
			display: block;
			background: var(--surface-raised);
			border-top: 1px solid var(--border);
			padding-top: 18px;
			padding-bottom: 18px;
		}
		.section-row th {
			border: 0;
			background: transparent;
		}
		.property-row {
			gap: 12px;
			border-bottom: 1px solid var(--border);
		}
		.property-row th {
			grid-column: 1 / -1;
			border: 0;
			font-size: 13px;
		}
		.property-row td {
			display: flex;
			flex-direction: column;
			gap: 6px;
			border: 0;
			font-size: 13px;
		}
		.mobile-element-label {
			display: block;
			font-size: 14px;
			font-weight: 600;
			font-family: var(--font-display);
		}
		tfoot tr {
			gap: 8px 12px;
		}
		tfoot th {
			grid-column: 1 / -1;
			margin-bottom: 4px;
		}
		tfoot a {
			flex-wrap: wrap;
			font-size: 13px;
			line-height: 1.5;
		}
		.data-note {
			font-size: 12px;
		}
	}
	@media (max-width: 440px) {
		.tool-header {
			flex-direction: column;
			gap: 16px;
		}
		.selection-heading {
			align-items: flex-start;
		}
		.selection-heading h2 {
			font-size: 18px;
		}
		.selection-count {
			font-size: 12px;
			white-space: nowrap;
			padding-top: 4px;
		}
		.add-element-form {
			grid-template-columns: minmax(0, 1fr);
		}
		.add-button {
			width: 100%;
		}
		.comparison-table tr {
			column-gap: 8px;
			padding-left: 14px;
			padding-right: 14px;
		}
		.property-row td {
			font-size: 12px;
		}
	}
</style>

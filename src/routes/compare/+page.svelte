<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import ElectronConfiguration from '#lib/components/ElectronConfiguration.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PeriodicTablePicker from '#lib/components/PeriodicTablePicker.svelte';
	import {
		getDifferingOrbitals,
		getElectronConfiguration,
		orbitalNotation
	} from '#lib/chemistry/electron-configuration.js';
	import { categories, getElement, type Element } from '#lib/data/elements.js';

	let pending = $state(false);
	let notice = $state('');
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
	const configurations = $derived(
		new Map(selected.map((element) => [element.number, getElectronConfiguration(element)]))
	);
	const differingOrbitals = $derived(getDifferingOrbitals([...configurations.values()]));

	function fullConfiguration(element: Element) {
		const result = configurations.get(element.number);
		return result?.status === 'available' ? result.full : 'Not available';
	}

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
		rows: {
			label: string;
			value: (element: Element) => string;
			format?: 'electron-configuration';
		}[];
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
					label: 'Full electron configuration',
					format: 'electron-configuration',
					value: fullConfiguration
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
			notice = 'The comparison could not be updated. Try again.';
		} finally {
			pending = false;
		}
	}

	function toggleElement(element: Element) {
		if (pending) return;
		if (selected.some((chosen) => chosen.number === element.number)) {
			const next = selected.filter((chosen) => chosen.number !== element.number);
			void setSelection(next, `Removed ${element.name}. ${next.length} elements selected.`);
		} else if (selected.length < 4) {
			void setSelection(
				[...selected, element],
				`Added ${element.name}. ${selected.length + 1} elements selected.`
			);
		} else {
			notice = 'Four elements selected. Remove an element to choose another.';
		}
	}

	async function removeElement(element: Element) {
		if (pending) return;
		const next = selected.filter((chosen) => chosen.number !== element.number);
		await setSelection(next, `Removed ${element.name}. ${next.length} elements selected.`);
		await tick();
		document
			.querySelector<HTMLButtonElement>(`.periodic-picker [data-element="${element.number}"]`)
			?.focus();
	}

	async function clearSelection() {
		if (pending) return;
		await setSelection([], 'Comparison cleared. Select elements from the periodic table.');
		await tick();
		document.querySelector<HTMLButtonElement>('.periodic-picker [data-element="1"]')?.focus();
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
			<p class="text-muted">
				Pick up to four elements from the periodic table to compare their properties.
			</p>
		</div>
	</header>

	<section class="selection-panel panel" aria-labelledby="selection-heading">
		<div class="selection-heading">
			<h2 id="selection-heading">Select elements</h2>
			<div class="selection-actions">
				<span class="selection-count">{selected.length} of 4 selected</span>
				<button
					class="clear-selection"
					type="button"
					disabled={pending || selected.length === 0}
					onclick={clearSelection}>Clear all</button
				>
			</div>
		</div>

		<div class="selected-elements" aria-label="Selected elements">
			{#if selected.length > 0}
				{#each selected as element (element.number)}
					<button
						type="button"
						class="selected-element"
						style={`--element-color: var(--category-${element.category}); --element-bg: var(--category-${element.category}-bg)`}
						aria-label={`Remove ${element.name} from comparison`}
						onclick={() => removeElement(element)}
						disabled={pending}
					>
						<strong>{element.symbol}</strong>
						<span>{element.name}</span>
						<Icon name="close" size={14} />
					</button>
				{/each}
			{:else}
				<p class="empty-selection">Click an element below to start your comparison.</p>
			{/if}
		</div>
		<p class="selection-instructions text-muted" id="selection-instructions">
			{selected.length >= 4
				? 'Four elements selected. Click a selected element again to remove it.'
				: 'Click an element to select it. Click it again to remove it.'}
		</p>

		<PeriodicTablePicker {selected} {pending} onselect={toggleElement} />

		<div class="selection-footer">
			<p class="text-muted">Your selection is saved in this page’s link.</p>
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
				<h2 id="properties-heading" tabindex="-1">Side by side</h2>
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
											<span class:full-configuration={row.format === 'electron-configuration'}>
												{#if row.format === 'electron-configuration'}
													{@const result = configurations.get(element.number)}
													{#if result?.status === 'available'}
														{#each result.orbitals as orbital (`${orbital.n}${orbital.subshell}`)}
															{@const different = differingOrbitals.has(
																`${orbital.n}${orbital.subshell}`
															)}
															<span class="configuration-orbital" class:different>
																<ElectronConfiguration configuration={orbitalNotation(orbital)} />
																{#if different}<span class="sr-only"
																		>Differs across selected elements.</span
																	>{/if}
															</span>{' '}
														{/each}
													{:else}
														Not available
													{/if}
												{:else}
													{row.value(element)}
												{/if}
											</span>
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
		margin-bottom: 32px;
	}
	.tool-header p {
		margin-top: 10px;
		font-size: 15px;
		line-height: 1.6;
	}
	.selection-panel {
		padding: 24px;
	}
	.selection-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		margin-bottom: 16px;
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
		white-space: nowrap;
	}
	.selection-actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.clear-selection {
		min-height: 44px;
		padding: 0 12px;
		border: 1px solid var(--border);
		border-radius: 7px;
		background: transparent;
		color: var(--muted);
		font-size: 13px;
		white-space: nowrap;
	}
	.clear-selection:hover:not(:disabled) {
		background: var(--surface-raised);
		color: var(--text);
	}
	.selected-elements {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		min-height: 44px;
	}
	.selected-element {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		padding: 8px 12px;
		border: 1px solid color-mix(in srgb, var(--element-color) 34%, var(--border));
		border-radius: 7px;
		background: var(--element-bg);
		color: var(--text);
		font-size: 13px;
	}
	.selected-element:hover:not(:disabled) {
		border-color: var(--element-color);
	}
	.selected-element strong {
		font-family: var(--font-display);
		font-size: 20px;
		font-weight: 500;
		color: var(--element-color);
	}
	.selected-element :global(svg) {
		color: var(--muted);
	}
	.selection-instructions {
		min-height: 21px;
		margin: 12px 0 20px;
		font-size: 13px;
		line-height: 1.6;
	}
	.selection-footer {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px 20px;
		margin-top: 20px;
		padding-top: 12px;
		border-top: 1px solid var(--border);
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
		color: var(--muted);
		font-size: 14px;
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
	.full-configuration {
		line-height: 2;
	}
	.configuration-orbital {
		display: inline-block;
		padding: 0 3px;
		border-radius: 4px;
		white-space: nowrap;
	}
	.configuration-orbital.different {
		color: var(--accent);
		background: var(--accent-soft);
		font-weight: 600;
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
			padding: 16px;
		}
		.selected-element {
			padding: 8px 10px;
			gap: 8px;
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
		.selection-heading {
			flex-direction: column;
			align-items: stretch;
			gap: 8px;
		}
		.selection-heading h2 {
			font-size: 18px;
		}
		.selection-actions {
			justify-content: space-between;
		}
		.selection-count {
			font-size: 12px;
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

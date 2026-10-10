<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import TrendChart from '#lib/components/TrendChart.svelte';
	import {
		searchElements,
		availableTrends,
		formatTrendValue,
		getTrendValue,
		type TrendId
	} from '#lib/data/elements.js';

	import { VIEW_DEFAULTS, readTrendsView } from '#lib/view-state.js';
	const pageSize = 24;
	type SortKey = 'number' | 'name' | 'value';
	let selectedTrend = $state<TrendId>(VIEW_DEFAULTS.trends.property);
	let view = $state<'chart' | 'table'>(VIEW_DEFAULTS.trends.view);
	let period = $state(VIEW_DEFAULTS.trends.period);
	let query = $state('');
	let pageIndex = $state(0);
	let sortKey = $state<SortKey>('number');
	let sortDirection = $state<'ascending' | 'descending'>('ascending');
	let effectiveUrl = $derived(page.shallow?.url ?? page.url);
	let definition = $derived(availableTrends.find((item) => item.id === selectedTrend)!);
	let filteredElements = $derived(
		searchElements(query).filter((element) => period === 'all' || element.period === Number(period))
	);
	let knownElements = $derived(
		filteredElements.filter((element) => getTrendValue(element, selectedTrend) !== null)
	);
	let rankedElements = $derived(
		[...knownElements].sort(
			(a, b) => getTrendValue(a, selectedTrend)! - getTrendValue(b, selectedTrend)!
		)
	);
	let minimumElement = $derived(rankedElements[0]);
	let maximumElement = $derived(rankedElements.at(-1));
	let sortedElements = $derived.by(() => {
		const direction = sortDirection === 'ascending' ? 1 : -1;
		return [...filteredElements].sort((a, b) => {
			if (sortKey === 'number') return (a.number - b.number) * direction;
			if (sortKey === 'name') return a.name.localeCompare(b.name) * direction;
			const aValue = getTrendValue(a, selectedTrend);
			const bValue = getTrendValue(b, selectedTrend);
			if (aValue === null && bValue === null) return a.number - b.number;
			if (aValue === null) return 1;
			if (bValue === null) return -1;
			return (aValue - bValue) * direction || a.number - b.number;
		});
	});
	let totalPages = $derived(Math.max(1, Math.ceil(sortedElements.length / pageSize)));
	let visibleElements = $derived(
		sortedElements.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
	);

	$effect(() => {
		if (!browser) return;
		const parameters = effectiveUrl.searchParams;
		untrack(() => {
			const requested = readTrendsView(parameters);
			selectedTrend = requested.property;
			view = requested.view;
			period = requested.period;
			pageIndex = 0;
		});
	});

	function syncUrl() {
		if (!browser) return;
		const url = new URL(window.location.href);
		url.searchParams.set('property', selectedTrend);
		if (view === 'table') url.searchParams.set('view', 'table');
		else url.searchParams.delete('view');
		if (period !== 'all') url.searchParams.set('period', period);
		else url.searchParams.delete('period');
		void goto(url, { shallow: true, replace: true });
	}

	function selectTrend(trend: TrendId) {
		selectedTrend = trend;
		pageIndex = 0;
		syncUrl();
	}

	function selectView(nextView: 'chart' | 'table') {
		view = nextView;
		if (nextView === 'chart') {
			query = '';
			pageIndex = 0;
		}
		syncUrl();
	}

	function selectPeriod(nextPeriod: string) {
		period = nextPeriod;
		pageIndex = 0;
		syncUrl();
	}

	function sortBy(key: SortKey) {
		if (sortKey === key) sortDirection = sortDirection === 'ascending' ? 'descending' : 'ascending';
		else {
			sortKey = key;
			sortDirection = key === 'value' ? 'descending' : 'ascending';
		}
		pageIndex = 0;
	}
</script>

<svelte:head>
	<title>Periodic trends · Periodicity</title>
	<meta
		name="description"
		content="Explore six periodic trends across all 118 elements. Compare ionization energy, electronegativity, atomic radius, electron affinity, density, and melting point with interactive charts and exact data."
	/>
</svelte:head>

<div class="page-shell trends-page">
	<div class="page-intro">
		<div>
			<h1 class="page-heading">Periodic trends</h1>
			<p class="page-description">See the patterns. Understand the elements.</p>
		</div>
		<a class="table-return" href="/"><Icon name="table" size={18} /> Back to the table</a>
	</div>

	<div class="trends-workspace">
		<aside class="property-navigation" aria-label="Choose a periodic property">
			<h2>Choose a property</h2>
			<div class="property-list">
				{#each availableTrends as trend}
					<button
						class="property-option"
						class:selected={selectedTrend === trend.id}
						onclick={() => selectTrend(trend.id)}
						aria-pressed={selectedTrend === trend.id}
						style={`--property-color: ${trend.color}`}
					>
						<span class="property-indicator"></span>
						<span><strong>{trend.label}</strong><small>{trend.unit}</small></span>
						{#if selectedTrend === trend.id}<Icon name="check" size={16} />{/if}
					</button>
				{/each}
			</div>
			<div class="property-mobile">
				<label for="mobile-property">Property</label>
				<select
					id="mobile-property"
					value={selectedTrend}
					onchange={(event) => selectTrend(event.currentTarget.value as TrendId)}
				>
					{#each availableTrends as trend}<option value={trend.id}>{trend.label}</option>{/each}
				</select>
			</div>
			<p class="property-note">
				Each view uses the same reference data. Unavailable measurements stay separate from measured
				zeroes.
			</p>
		</aside>

		<section
			class="trend-main panel"
			aria-labelledby="selected-property"
			style={`--property-color: ${definition.color}`}
		>
			<div class="trend-main-heading">
				<div>
					<h2 id="selected-property">{definition.label}</h2>
					<div class="property-description">
						{#each availableTrends as item}
							<p class:current={selectedTrend === item.id} aria-hidden={selectedTrend !== item.id}>
								{item.description}
							</p>
						{/each}
					</div>
				</div>
				<div class="view-switch" aria-label="Visualization view">
					<button
						class:active={view === 'chart'}
						onclick={() => selectView('chart')}
						aria-pressed={view === 'chart'}
						><Icon name="chart" size={16} /><span>Chart</span></button
					>
					<button
						class:active={view === 'table'}
						onclick={() => selectView('table')}
						aria-pressed={view === 'table'}><Icon name="table" size={16} /><span>Data</span></button
					>
				</div>
			</div>

			<div class="trend-filters">
				<div class="period-filter">
					<label for="period-filter">Show</label><select
						id="period-filter"
						value={period}
						onchange={(event) => selectPeriod(event.currentTarget.value)}
						><option value="all">All periods</option>{#each [1, 2, 3, 4, 5, 6, 7] as item}<option
								value={String(item)}>Period {item}</option
							>{/each}</select
					>
				</div>
				<span class="data-coverage"
					>{knownElements.length} of {filteredElements.length} values recorded</span
				>
			</div>

			{#if view === 'chart'}
				<TrendChart trend={selectedTrend} items={filteredElements} />
			{:else}
				<div class="table-search">
					<label for="trend-search">Find an element</label>
					<div>
						<Icon name="search" size={18} /><input
							id="trend-search"
							type="search"
							value={query}
							oninput={(event) => {
								query = event.currentTarget.value;
								pageIndex = 0;
							}}
							placeholder="Name, symbol, or atomic number"
							autocomplete="off"
						/>
					</div>
				</div>
				<div class="data-table-wrap">
					<table>
						<caption class="sr-only"
							>{definition.label} in {definition.unit} for {period === 'all'
								? 'all periods'
								: `period ${period}`}. Activate a column heading to sort.</caption
						>
						<thead
							><tr>
								<th scope="col" aria-sort={sortKey === 'number' ? sortDirection : 'none'}
									><button onclick={() => sortBy('number')} aria-label="Sort by atomic number"
										>No.<span aria-hidden="true"
											>{sortKey === 'number'
												? sortDirection === 'ascending'
													? '↑'
													: '↓'
												: '↕'}</span
										></button
									></th
								>
								<th scope="col" aria-sort={sortKey === 'name' ? sortDirection : 'none'}
									><button onclick={() => sortBy('name')}
										>Element<span aria-hidden="true"
											>{sortKey === 'name'
												? sortDirection === 'ascending'
													? '↑'
													: '↓'
												: '↕'}</span
										></button
									></th
								>
								<th scope="col" class="period-column">Period</th>
								<th
									scope="col"
									class="value-column"
									aria-sort={sortKey === 'value' ? sortDirection : 'none'}
									><button
										onclick={() => sortBy('value')}
										aria-label={`Sort by ${definition.label}`}
										>Value<span aria-hidden="true"
											>{sortKey === 'value'
												? sortDirection === 'ascending'
													? '↑'
													: '↓'
												: '↕'}</span
										></button
									></th
								>
							</tr></thead
						>
						<tbody>
							{#each visibleElements as element}
								<tr
									><td class="number-cell">{element.number}</td><td
										><a class="table-element" href={`/element/${element.number}/`}
											><span
												class="table-symbol"
												style={`color: var(--category-${element.category}); background: var(--category-${element.category}-bg)`}
												>{element.symbol}</span
											><span>{element.name}</span></a
										></td
									><td class="period-column">{element.period}</td><td
										class="value-column"
										class:unavailable={getTrendValue(element, selectedTrend) === null}
										>{formatTrendValue(element, selectedTrend)}</td
									></tr
								>
							{/each}
						</tbody>
					</table>
					{#if visibleElements.length === 0}
						<p class="no-results" role="status">
							No elements match “{query}”. Try a name, symbol, or atomic number.
						</p>
					{/if}
				</div>
				<div class="table-pagination">
					<span
						>{sortedElements.length
							? `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, sortedElements.length)} of ${sortedElements.length} elements`
							: '0 elements'}<small>Values in {definition.unit}</small></span
					>
					<div>
						<button
							class="icon-button"
							aria-label="Previous page"
							disabled={pageIndex === 0}
							onclick={() => (pageIndex -= 1)}><Icon name="arrow-left" size={18} /></button
						><button
							class="icon-button"
							aria-label="Next page"
							disabled={pageIndex >= totalPages - 1}
							onclick={() => (pageIndex += 1)}><Icon name="arrow-right" size={18} /></button
						>
					</div>
				</div>
			{/if}

			<div class="trend-extremes">
				<div>
					<span>Lowest recorded</span>{#if minimumElement}<a
							href={`/element/${minimumElement.number}/`}
							><strong>{minimumElement.name}</strong><span
								>{formatTrendValue(minimumElement, selectedTrend)}
								<small>{definition.unit}</small></span
							></a
						>{:else}<strong>No recorded values</strong>{/if}
				</div>
				<div>
					<span>Highest recorded</span>{#if maximumElement}<a
							href={`/element/${maximumElement.number}/`}
							><strong>{maximumElement.name}</strong><span
								>{formatTrendValue(maximumElement, selectedTrend)}
								<small>{definition.unit}</small></span
							></a
						>{:else}<strong>No recorded values</strong>{/if}
				</div>
			</div>
		</section>
	</div>

	<div class="trend-reference">
		<Icon name="flask" size={20} />
		<p>
			These are reference values, with measurement gaps and exceptions. Open an element to inspect
			its properties, or <a href="/compare/">compare elements side by side</a>.
		</p>
	</div>
</div>

<style>
	.table-return {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		color: var(--muted);
		font-size: 13px;
		min-height: 44px;
		border-radius: 4px;
	}
	.table-return:hover {
		color: var(--text);
	}
	.trends-workspace {
		display: grid;
		grid-template-columns: 232px minmax(0, 1fr);
		gap: 32px;
		align-items: start;
	}
	.property-navigation {
		padding-top: 6px;
	}
	.property-navigation h2 {
		font-size: 13px;
		font-family: var(--font-body);
		color: var(--muted);
		font-weight: 500;
		margin: 0 0 16px 12px;
	}
	.property-list {
		display: grid;
		gap: 5px;
	}
	.property-option {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 13px 13px;
		width: 100%;
		border: 1px solid transparent;
		border-radius: 8px;
		background: transparent;
		text-align: left;
		min-height: 66px;
		transition:
			background var(--motion-fast),
			border-color var(--motion-fast);
	}
	.property-option:hover {
		background: var(--surface);
	}
	.property-option.selected {
		background: var(--surface);
		border-color: var(--border);
	}
	.property-indicator {
		flex-shrink: 0;
		width: 3px;
		height: 25px;
		border-radius: 2px;
		background: var(--property-color);
	}
	.property-option strong {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: var(--muted);
	}
	.property-option.selected strong {
		color: var(--text);
	}
	.property-option small {
		display: block;
		font-size: 11px;
		color: var(--muted);
		margin-top: 3px;
	}
	.property-option :global(svg) {
		color: var(--property-color);
		margin-left: auto;
	}
	.property-note {
		color: var(--muted);
		font-size: 12px;
		line-height: 1.8;
		padding: 0 13px;
		margin-top: 25px;
	}
	.property-mobile {
		display: none;
	}
	.trend-main {
		min-width: 0;
		padding: 29px 32px 26px;
	}
	.trend-main-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 24px;
	}
	.trend-main-heading h2 {
		font-size: 25px;
		letter-spacing: -0.6px;
	}
	.trend-main-heading > div:first-child {
		flex: 1;
		min-width: 0;
	}
	.property-description {
		display: grid;
	}
	.trend-main-heading p {
		color: var(--muted);
		font-size: 13px;
		line-height: 1.8;
		max-width: 60ch;
		margin-top: 9px;
		grid-area: 1 / 1;
		visibility: hidden;
	}
	.trend-main-heading p.current {
		visibility: visible;
	}
	.view-switch {
		display: flex;
		background: var(--bg);
		border: 1px solid var(--border);
		padding: 4px;
		border-radius: 8px;
		flex-shrink: 0;
	}
	.view-switch button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		font-size: 12px;
		color: var(--muted);
		padding: 8px 10px;
		min-height: 44px;
		border: 0;
		border-radius: 5px;
		background: transparent;
	}
	.view-switch button.active {
		color: var(--text);
		background: var(--surface-raised);
	}
	.trend-filters {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin: 24px 0 15px;
		padding-bottom: 18px;
		border-bottom: 1px solid var(--border);
	}
	.period-filter {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.period-filter label {
		color: var(--muted);
		font-size: 12px;
	}
	.period-filter select {
		font-size: 13px;
		background: var(--surface-raised);
		min-height: 44px;
		padding: 8px 12px;
	}
	.data-coverage {
		color: var(--muted);
		font-size: 12px;
	}
	.table-search {
		margin: 17px 0;
	}
	.table-search > label {
		display: block;
		color: var(--muted);
		font-size: 12px;
		margin-bottom: 8px;
	}
	.table-search > div {
		position: relative;
	}
	.table-search :global(svg) {
		position: absolute;
		top: 13px;
		left: 13px;
		color: var(--muted);
	}
	.table-search input {
		width: 100%;
		padding-left: 40px;
		font-size: 14px;
		background: var(--surface-raised);
	}
	.data-table-wrap {
		border-top: 1px solid var(--border);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		table-layout: fixed;
	}
	th {
		color: var(--muted);
		text-align: left;
		font-weight: 400;
		font-size: 11px;
		border-bottom: 1px solid var(--border);
	}
	th button {
		background: transparent;
		color: inherit;
		padding: 7px 0;
		border: 0;
		display: inline-flex;
		align-items: center;
		gap: 9px;
		min-height: 44px;
		font-size: 12px;
	}
	th button span {
		font-size: 14px;
		width: 1em;
		flex-shrink: 0;
		text-align: center;
	}
	th:first-child {
		width: 60px;
	}
	th,
	td {
		padding: 8px 12px;
	}
	th:first-child,
	td:first-child {
		padding-left: 0;
	}
	th:last-child,
	td:last-child {
		padding-right: 0;
	}
	td {
		border-bottom: 1px solid var(--border);
		font-variant-numeric: tabular-nums;
	}
	.number-cell {
		color: var(--muted);
	}
	.table-element {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		border-radius: 4px;
		font-size: 13px;
		max-width: 100%;
	}
	.table-element > span:last-child {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.table-element:hover {
		color: var(--accent);
	}
	.table-symbol {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 5px;
		font-family: var(--font-display);
		font-size: 18px;
		flex-shrink: 0;
	}
	.period-column {
		width: 70px;
		text-align: center;
		color: var(--muted);
	}
	.value-column {
		width: 140px;
		text-align: right;
	}
	th.value-column button {
		justify-content: end;
	}
	.unavailable {
		color: var(--muted);
		font-size: 12px;
	}
	.no-results {
		padding: 28px 0;
		font-size: 13px;
		color: var(--muted);
		text-align: center;
		line-height: 1.8;
	}
	.table-pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding-top: 17px;
	}
	.table-pagination > span {
		font-size: 12px;
		color: var(--muted);
	}
	.table-pagination small {
		display: block;
		font-size: 11px;
		margin-top: 4px;
	}
	.table-pagination > div {
		display: flex;
		gap: 8px;
	}
	.trend-extremes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		margin-top: 25px;
		padding-top: 21px;
		border-top: 1px solid var(--border);
	}
	.trend-extremes > div + div {
		border-left: 1px solid var(--border);
		padding-left: 24px;
	}
	.trend-extremes > div > span {
		display: block;
		font-size: 11px;
		color: var(--muted);
		margin-bottom: 8px;
	}
	.trend-extremes a {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 6px 14px;
		min-height: 36px;
		border-radius: 4px;
	}
	.trend-extremes strong {
		font-size: 14px;
		font-weight: 500;
	}
	.trend-extremes a > span {
		font-family: var(--font-display);
		color: var(--property-color);
		font-size: 19px;
		font-variant-numeric: tabular-nums;
	}
	.trend-extremes small {
		font-family: var(--font-body);
		font-size: 10px;
		color: var(--muted);
	}
	.trend-reference {
		display: flex;
		align-items: start;
		gap: 12px;
		color: var(--muted);
		max-width: 72ch;
		margin: 26px 0 0 264px;
	}
	.trend-reference :global(svg) {
		margin-top: 1px;
		color: var(--accent);
	}
	.trend-reference p {
		font-size: 12px;
		line-height: 1.8;
	}
	.trend-reference a {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	@media (max-width: 1100px) {
		.trends-workspace {
			grid-template-columns: 205px minmax(0, 1fr);
			gap: 24px;
		}
		.trend-main {
			padding: 24px;
		}
		.trend-reference {
			margin-left: 229px;
		}
		.trend-main-heading {
			flex-direction: column;
		}
		.view-switch {
			align-self: end;
			margin-top: -8px;
		}
	}
	@media (max-width: 800px) {
		.trends-workspace {
			grid-template-columns: 1fr;
			gap: 20px;
		}
		.property-navigation {
			padding-top: 0;
		}
		.property-list {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 8px;
		}
		.property-navigation h2 {
			margin-left: 0;
		}
		.property-option {
			padding: 10px;
			min-height: 62px;
			gap: 9px;
		}
		.property-option strong {
			font-size: 12px;
		}
		.property-option :global(svg) {
			display: none;
		}
		.property-note {
			display: none;
		}
		.trend-main-heading {
			flex-direction: row;
		}
		.view-switch {
			margin-top: 0;
			align-self: start;
		}
		.trend-reference {
			margin-left: 0;
		}
	}
	@media (max-width: 600px) {
		.table-return {
			display: none;
		}
		.property-list,
		.property-navigation h2 {
			display: none;
		}
		.property-mobile {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr);
			gap: 14px;
			align-items: center;
		}
		.property-mobile label {
			font-size: 13px;
			color: var(--muted);
		}
		.property-mobile select {
			width: 100%;
			font-size: 14px;
			background: var(--surface-raised);
		}
		.trend-main {
			padding: 20px 16px;
		}
		.trend-main-heading {
			flex-direction: column;
		}
		.trend-main-heading h2 {
			font-size: 23px;
		}
		.trend-main-heading p {
			font-size: 12px;
		}

		.view-switch button {
			padding: 8px 14px;
		}
		.trend-filters {
			flex-wrap: wrap;
			gap: 10px;
			margin-top: 20px;
			padding-bottom: 16px;
		}
		.data-coverage {
			font-size: 11px;
		}
		.trend-extremes {
			gap: 16px;
		}
		.trend-extremes > div + div {
			padding-left: 16px;
		}
		.trend-extremes a {
			display: block;
		}
		.trend-extremes strong {
			display: block;
			font-size: 13px;
			margin-bottom: 3px;
		}
		.trend-extremes a > span {
			font-size: 18px;
		}
		th,
		td {
			padding: 7px 5px;
		}
		th:first-child {
			width: 44px;
		}
		.period-column {
			display: none;
		}
		.table-element {
			gap: 8px;
			font-size: 12px;
		}
		.table-symbol {
			width: 30px;
			height: 34px;
			font-size: 16px;
		}
		.value-column {
			font-size: 12px;
			width: 84px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.property-option {
			transition: none;
		}
	}
</style>

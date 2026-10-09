<script lang="ts">
	import Atom from '#lib/components/Atom.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import TrendChart from '#lib/components/TrendChart.svelte';
	import { categories, getElement, trendDefinitions, type TrendId } from '#lib/data/elements.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let element = $derived(data.element);
	let category = $derived(categories.find((item) => item.id === element.category));
	let previous = $derived(getElement(element.number - 1));
	let next = $derived(getElement(element.number + 1));
	let selectedTrend = $state<TrendId>('ionizationEnergy');
	let availableTrends = $derived(trendDefinitions.filter((item) => item.id !== 'atomicMass'));
	let configurationParts = $derived(element.electronConfiguration.split(/(\d[spdf]\d+)/g));

	function number(value: number | null | undefined, unit = '') {
		if (value === null || value === undefined || !Number.isFinite(value)) return 'Not available';
		const formatted = new Intl.NumberFormat('en', { maximumFractionDigits: 10 }).format(value);
		return unit ? `${formatted} ${unit}` : formatted;
	}

	function text(value: string | number | null | undefined) {
		if (value === null || value === undefined || value === '') return 'Not recorded';
		return String(value).replace(/^./, (letter) => letter.toUpperCase());
	}
</script>

<svelte:head>
	<title>{element.name} ({element.symbol}) · Periodicity</title>
	<meta
		name="description"
		content={`Explore ${element.name}: atomic number ${element.number}, electron configuration, physical properties, and periodic trends.`}
	/>
</svelte:head>

<div
	class="page-shell element-page"
	style={`--element-color: var(--category-${element.category}); --element-bg: var(--category-${element.category}-bg)`}
>
	<div class="element-toolbar">
		<a class="back-link" href="/"><Icon name="arrow-left" size={18} /> Periodic table</a>
		<div class="position-label">
			<span>Period {element.period}</span><span
				>{element.group ? `Group ${element.group}` : (category?.label ?? 'f-block element')}</span
			>
		</div>
	</div>

	<section class="element-hero" aria-labelledby="element-title">
		<div class="specimen">
			<div class="specimen-top">
				<span>{element.number}</span><span>{text(element.phase)}</span>
			</div>
			<span class="element-symbol">{element.symbol}</span>
			<span class="specimen-mass">{number(element.atomicMass)}</span>
			<span class="specimen-mass-label">Atomic mass · u</span>
		</div>

		<div class="element-story">
			<span class="category-label"
				><span class="category-dot"></span>{category?.label ?? text(element.category)}</span
			>
			<h1 id="element-title">{element.name}</h1>
			<p class="element-summary">
				{element.summary ||
					`Explore the atomic structure and physical properties of ${element.name}.`}
			</p>
			<div class="discovery-line">
				<span>Discovery</span>
				<strong>{text(element.yearDiscovered)}</strong>
				{#if element.discoveredBy}<span class="discoverer">({element.discoveredBy})</span>{/if}
			</div>
		</div>

		<div class="atom-preview"><Atom {element} /></div>
	</section>

	<section class="physical-section" aria-labelledby="physical-heading">
		<div class="section-heading">
			<h2 id="physical-heading">Physical properties</h2>
			<p>Values for the element in its standard state.</p>
		</div>
		<dl class="physical-properties">
			<div>
				<dt>Density</dt>
				<dd>
					{number(element.density)}{#if element.density !== null}<small>g/cm³</small>{/if}
				</dd>
			</div>
			<div>
				<dt>Melting point</dt>
				<dd>
					{number(element.meltingPoint)}{#if element.meltingPoint !== null}<small>K</small>{/if}
				</dd>
			</div>
			<div>
				<dt>Boiling point</dt>
				<dd>
					{number(element.boilingPoint)}{#if element.boilingPoint !== null}<small>K</small>{/if}
				</dd>
			</div>
			<div>
				<dt>Atomic radius</dt>
				<dd>
					{number(element.atomicRadius)}{#if element.atomicRadius !== null}<small>pm</small>{/if}
				</dd>
			</div>
			<div>
				<dt>Bonding type</dt>
				<dd class="text-value">{text(element.bondingType)}</dd>
			</div>
			<div>
				<dt>Molar heat</dt>
				<dd>
					{number(element.molarHeat)}{#if element.molarHeat !== null}<small>J/(mol·K)</small>{/if}
				</dd>
			</div>
		</dl>
	</section>

	<div class="detail-columns">
		<section class="panel electron-panel" aria-labelledby="electronic-heading">
			<h2 id="electronic-heading">Inside the atom</h2>
			<p class="panel-description">Electron arrangement and the energy behind its behavior.</p>
			<div class="configuration">
				<span>Electron configuration</span>
				<strong
					>{#each configurationParts as part}{@const orbital =
							part.match(/^(\d[spdf])(\d+)$/)}{#if orbital}<span class="orbital"
								>{orbital[1]}<sup>{orbital[2]}</sup></span
							>{:else}{part ||
								(element.electronConfiguration ? '' : 'Not available')}{/if}{/each}</strong
				>
			</div>
			<dl class="electronic-properties">
				<div>
					<dt>Electronegativity</dt>
					<dd>{number(element.electronegativity)}<small>Pauling scale</small></dd>
				</div>
				<div>
					<dt>First ionization energy</dt>
					<dd>
						{number(element.ionizationEnergy)}{#if element.ionizationEnergy !== null}<small
								>kJ/mol</small
							>{/if}
					</dd>
				</div>
				<div>
					<dt>Electron affinity</dt>
					<dd>
						{number(element.electronAffinity)}{#if element.electronAffinity !== null}<small
								>kJ/mol</small
							>{/if}
					</dd>
				</div>
				<div>
					<dt>Van der Waals radius</dt>
					<dd>
						{number(element.vanDerWaalsRadius)}{#if element.vanDerWaalsRadius !== null}<small
								>pm</small
							>{/if}
					</dd>
				</div>
			</dl>
		</section>

		<section class="panel element-trends" aria-labelledby="trends-heading">
			<div class="trend-heading">
				<h2 id="trends-heading">Across the table</h2>
				<a
					class="chart-link"
					href={`/trends/?property=${selectedTrend}`}
					aria-label="Explore all periodic trends"><Icon name="external" size={18} /></a
				>
			</div>
			<label class="trend-label" for="detail-trend">Compare a property</label>
			<select id="detail-trend" bind:value={selectedTrend}>
				{#each availableTrends as trend}<option value={trend.id}>{trend.label}</option>{/each}
			</select>
			<TrendChart trend={selectedTrend} active={element.number} compact />
		</section>
	</div>

	<section class="element-notes" aria-labelledby="notes-heading">
		<h2 id="notes-heading">About {element.name.toLowerCase()}</h2>
		<dl>
			<div>
				<dt>Appearance</dt>
				<dd>{text(element.appearance)}</dd>
			</div>
			<div>
				<dt>Discovery</dt>
				<dd>
					{element.yearDiscovered
						? `${element.yearDiscovered}${element.discoveredBy ? ` (${element.discoveredBy})` : ''}`
						: text(element.discoveredBy)}
				</dd>
			</div>
			<div>
				<dt>Data source</dt>
				<dd>
					{#if element.source}<a href={element.source} target="_blank" rel="noreferrer"
							>Read the reference <Icon name="external" size={15} /></a
						>{:else}Source not recorded{/if}
				</dd>
			</div>
		</dl>
		<p class="data-note">
			A missing value means it is unavailable in this reference dataset. Values can vary with
			measurement method and conditions.
		</p>
	</section>

	<nav class="neighbor-nav" aria-label="Browse neighboring elements">
		{#if previous}
			<a href={`/element/${previous.number}/`} class="neighbor previous"
				><Icon name="arrow-left" size={20} /><span
					class="neighbor-symbol"
					style={`color: var(--category-${previous.category})`}>{previous.symbol}</span
				><span><small>Previous element</small><strong>{previous.name}</strong></span><span
					class="neighbor-number">{previous.number}</span
				></a
			>
		{:else}<div class="neighbor-placeholder"></div>{/if}
		{#if next}
			<a href={`/element/${next.number}/`} class="neighbor next"
				><span class="neighbor-number">{next.number}</span><span
					><small>Next element</small><strong>{next.name}</strong></span
				><span class="neighbor-symbol" style={`color: var(--category-${next.category})`}
					>{next.symbol}</span
				><Icon name="arrow-right" size={20} /></a
			>
		{:else}<div class="neighbor-placeholder"></div>{/if}
	</nav>
</div>

<style>
	.element-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 32px;
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--muted);
		font-size: 14px;
		min-height: 44px;
		text-decoration: none;
		border-radius: 4px;
	}
	.back-link:hover {
		color: var(--text);
	}
	.position-label {
		display: flex;
		gap: 20px;
		color: var(--muted);
		font-size: 13px;
	}
	.position-label span + span {
		border-left: 1px solid var(--border);
		padding-left: 20px;
	}
	.element-hero {
		display: grid;
		grid-template-columns: 215px minmax(0, 1fr) 320px;
		gap: 36px;
		align-items: center;
		padding-bottom: 38px;
	}
	.specimen {
		min-height: 267px;
		border: 1px solid var(--element-color);
		background: var(--element-bg);
		border-radius: 12px;
		padding: 19px 20px;
		display: flex;
		flex-direction: column;
		color: var(--element-color);
	}
	.specimen-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 18px;
		font-variant-numeric: tabular-nums;
	}
	.specimen-top span:last-child {
		font-family: 'DM Sans Variable', sans-serif;
		font-size: 12px;
	}
	.element-symbol {
		display: block;
		margin: auto 0;
		font-family: var(--font-display);
		font-size: 100px;
		font-weight: 500;
		letter-spacing: -6px;
		line-height: 1.2;
	}
	.specimen-mass {
		font-family: var(--font-display);
		font-size: 23px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.specimen-mass-label {
		font-size: 11px;
		margin-top: 3px;
	}
	.category-label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--element-color);
		font-size: 13px;
	}
	.category-dot {
		background: currentColor;
		height: 6px;
		width: 6px;
		border-radius: 50%;
	}
	h1 {
		font-family: var(--font-display);
		font-size: clamp(40px, 4.5vw, 60px);
		font-weight: 500;
		letter-spacing: -2px;
		line-height: 1.13;
		margin: 12px 0 18px;
		overflow-wrap: anywhere;
	}
	.element-summary {
		font-size: 15px;
		color: var(--muted);
		line-height: 1.8;
		margin: 0;
		max-width: 64ch;
	}
	.discovery-line {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		font-size: 12px;
		color: var(--muted);
		margin-top: 21px;
		line-height: 1.7;
	}
	.discovery-line strong {
		color: var(--text);
		font-weight: 500;
	}
	.atom-preview {
		max-width: 320px;
		width: 100%;
		justify-self: center;
	}
	h2 {
		font-family: var(--font-display);
		font-size: 21px;
		font-weight: 500;
		margin: 0;
		letter-spacing: -0.5px;
	}
	.physical-section {
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		padding: 29px 0 32px;
	}
	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 26px;
	}
	.section-heading p {
		font-size: 13px;
		color: var(--muted);
		margin: 0;
	}
	.physical-properties {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		margin: 0;
	}
	.physical-properties > div {
		padding: 0 20px;
		border-left: 1px solid var(--border);
		min-width: 0;
	}
	.physical-properties > div:first-child {
		border-left: 0;
		padding-left: 0;
	}
	.physical-properties > div:last-child {
		padding-right: 0;
	}
	dt {
		color: var(--muted);
		font-size: 12px;
		line-height: 1.5;
	}
	dd {
		color: var(--text);
		margin: 9px 0 0;
		font-family: var(--font-display);
		font-size: 22px;
		line-height: 1.4;
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}
	dd small {
		display: block;
		margin-top: 2px;
		font-family: 'DM Sans Variable', sans-serif;
		color: var(--muted);
		font-size: 11px;
	}
	dd.text-value {
		font-family: 'DM Sans Variable', sans-serif;
		font-size: 16px;
		padding-top: 3px;
	}
	.detail-columns {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr);
		gap: 24px;
		margin: 32px 0;
	}
	.electron-panel,
	.element-trends {
		padding: 28px;
		min-width: 0;
	}
	.panel-description {
		color: var(--muted);
		font-size: 13px;
		line-height: 1.7;
		margin: 9px 0 24px;
	}
	.configuration {
		background: var(--surface-raised);
		padding: 18px 20px;
		border-radius: 8px;
	}
	.configuration > span {
		display: block;
		color: var(--muted);
		font-size: 12px;
		margin-bottom: 10px;
	}
	.configuration strong {
		font-family: var(--font-display);
		font-size: 20px;
		line-height: 1.6;
		font-weight: 500;
		overflow-wrap: anywhere;
	}
	.orbital {
		white-space: nowrap;
	}
	.orbital sup {
		font-size: 0.65em;
	}
	.electronic-properties {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 24px 20px;
		margin: 26px 0 0;
	}
	.electronic-properties dd {
		font-size: 24px;
	}
	.trend-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
	}
	.chart-link {
		display: grid;
		place-items: center;
		min-width: 44px;
		min-height: 44px;
		color: var(--muted);
		border-radius: 6px;
		margin: -10px -10px -10px 0;
	}
	.chart-link:hover {
		background: var(--surface-raised);
		color: var(--text);
	}
	.trend-label {
		display: block;
		color: var(--muted);
		font-size: 12px;
		margin: 0 0 7px;
	}
	select {
		width: 100%;
		min-height: 44px;
		font: inherit;
		font-size: 14px;
		padding: 10px 12px;
		color: var(--text);
		background: var(--surface-raised);
		border: 1px solid var(--border);
		border-radius: 7px;
		margin-bottom: 14px;
	}
	.element-notes {
		padding: 0 0 32px;
	}
	.element-notes dl {
		display: grid;
		grid-template-columns: 1.2fr 1fr 0.8fr;
		gap: 24px;
		margin: 23px 0 22px;
	}
	.element-notes dd {
		font-family: 'DM Sans Variable', sans-serif;
		font-size: 14px;
		line-height: 1.7;
		margin-top: 6px;
	}
	.element-notes a {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		color: var(--accent);
		text-decoration: none;
		min-height: 32px;
	}
	.element-notes a:hover {
		text-decoration: underline;
	}
	.data-note {
		color: var(--muted);
		font-size: 12px;
		max-width: 84ch;
		line-height: 1.7;
		margin: 0;
	}
	.neighbor-nav {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		border-top: 1px solid var(--border);
		padding-top: 26px;
	}
	.neighbor {
		display: flex;
		align-items: center;
		gap: 15px;
		text-decoration: none;
		padding: 14px 18px;
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		min-width: 0;
		transition:
			background 150ms,
			border-color 150ms;
	}
	.neighbor:hover {
		background: var(--surface);
		border-color: var(--muted);
	}
	.neighbor small {
		display: block;
		color: var(--muted);
		font-size: 11px;
		margin-bottom: 3px;
	}
	.neighbor strong {
		display: block;
		font-weight: 500;
		font-size: 15px;
		overflow-wrap: anywhere;
	}
	.neighbor-symbol {
		font-family: var(--font-display);
		font-size: 30px;
		min-width: 43px;
	}
	.neighbor-number {
		font-family: var(--font-display);
		font-size: 24px;
		color: var(--muted);
		margin-left: auto;
	}
	.next {
		text-align: right;
		justify-content: flex-end;
	}
	.next .neighbor-number {
		margin-right: auto;
		margin-left: 0;
	}
	@media (max-width: 1180px) {
		.element-hero {
			grid-template-columns: 190px minmax(0, 1fr) 250px;
			gap: 24px;
		}
		.specimen {
			min-height: 245px;
		}
		.element-symbol {
			font-size: 88px;
		}
		.physical-properties {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 28px 0;
		}
		.physical-properties > div:nth-child(4) {
			border-left: 0;
			padding-left: 0;
		}
		.physical-properties > div:nth-child(3) {
			padding-right: 0;
		}
	}
	@media (max-width: 920px) {
		.element-hero {
			grid-template-columns: 180px minmax(0, 1fr);
			align-items: start;
			gap: 24px;
		}
		.atom-preview {
			grid-column: 1 / -1;
			max-width: 280px;
			margin-top: -4px;
		}
		.detail-columns {
			grid-template-columns: 1fr;
		}
		.section-heading {
			align-items: start;
			flex-direction: column;
			gap: 8px;
		}
	}
	@media (max-width: 600px) {
		.element-toolbar {
			margin-bottom: 21px;
			gap: 10px;
		}
		.position-label {
			font-size: 11px;
			gap: 10px;
		}
		.position-label span + span {
			padding-left: 10px;
		}
		.element-hero {
			grid-template-columns: 112px minmax(0, 1fr);
			gap: 17px;
			padding-bottom: 28px;
		}
		.specimen {
			min-height: 176px;
			padding: 12px;
			border-radius: 9px;
		}
		.specimen-top {
			font-size: 13px;
		}
		.specimen-top span:last-child {
			font-size: 9px;
		}
		.element-symbol {
			font-size: 64px;
			letter-spacing: -4px;
		}
		.specimen-mass {
			font-size: 16px;
		}
		.specimen-mass-label {
			font-size: 9px;
		}
		.category-label {
			font-size: 11px;
			gap: 6px;
		}
		h1 {
			font-size: 35px;
			letter-spacing: -1.2px;
			margin-top: 9px;
			margin-bottom: 14px;
		}
		.element-summary {
			font-size: 14px;
			line-height: 1.7;
		}
		.element-story {
			display: contents;
		}
		.element-story > .category-label {
			align-self: end;
		}
		.element-story > h1 {
			grid-column: 2;
			grid-row: 2;
			align-self: start;
		}
		.specimen {
			grid-row: 1 / 3;
		}
		.element-summary,
		.discovery-line {
			grid-column: 1 / -1;
		}
		.discovery-line {
			margin-top: -4px;
		}
		.atom-preview {
			max-width: 260px;
			margin-top: 0;
		}
		.physical-section {
			padding: 24px 0;
		}
		.physical-properties {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 23px 0;
		}
		.physical-properties > div {
			padding: 0 14px;
		}
		.physical-properties > div:nth-child(odd) {
			border-left: 0;
			padding-left: 0;
		}
		.physical-properties > div:nth-child(even) {
			border-left: 1px solid var(--border);
			padding-left: 16px;
			padding-right: 0;
		}
		dd {
			font-size: 22px;
		}
		.electron-panel,
		.element-trends {
			padding: 21px;
		}
		.detail-columns {
			gap: 20px;
			margin: 25px 0;
		}
		.configuration {
			padding: 16px;
		}
		.configuration strong {
			font-size: 18px;
		}
		.electronic-properties {
			gap: 23px 16px;
		}
		.electronic-properties dd {
			font-size: 21px;
		}
		.element-notes dl {
			grid-template-columns: 1fr;
			gap: 18px;
		}
		.neighbor-nav {
			gap: 12px;
		}
		.neighbor {
			padding: 12px;
			gap: 8px;
		}
		.neighbor-symbol {
			min-width: auto;
			font-size: 24px;
		}
		.neighbor-number {
			display: none;
		}
		.neighbor strong {
			font-size: 12px;
		}
		.neighbor small {
			font-size: 10px;
		}
		.neighbor :global(svg) {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.neighbor {
			transition: none;
		}
	}
</style>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { tick, untrack } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import {
		calculateMolarMass,
		formulaFragments,
		normalizeFormula,
		type MolarMassResult
	} from '#lib/chemistry/formula.js';

	let formula = $state('H2O');
	let result = $state<MolarMassResult | null>(calculateMolarMass('H2O'));
	let error = $state('');
	let notice = $state('');
	let lastUrlFormula: string | undefined;
	let formulaInput: HTMLInputElement;
	const massFormat = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 3,
		maximumFractionDigits: 3
	});
	const atomicMassFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 5 });
	const countFormat = new Intl.NumberFormat('en-US');
	const examples = [
		{ formula: 'H2O', name: 'Water' },
		{ formula: 'C6H12O6', name: 'Glucose' },
		{ formula: 'Ca(OH)2', name: 'Calcium hydroxide' },
		{ formula: 'CuSO4·5H2O', name: 'Copper sulfate pentahydrate' }
	];

	const isChanged = $derived(
		result !== null && normalizeFormula(formula).replace(/\s+/g, '') !== result.formula
	);
	const effectiveUrl = $derived(page.shallow?.url ?? page.url);
	const fragments = $derived(result ? formulaFragments(result.formula) : []);

	function compute(value: string): boolean {
		try {
			result = calculateMolarMass(value);
			error = '';
			notice = `${result.formula}: ${massFormat.format(result.totalMass)} grams per mole, ${result.totalAtoms} atoms in the formula.`;
			return true;
		} catch (cause) {
			result = null;
			error =
				cause instanceof Error
					? cause.message
					: 'This formula could not be calculated. Check the element symbols and counts.';
			notice = '';
			return false;
		}
	}

	$effect(() => {
		const fromUrl = effectiveUrl.searchParams.get('formula') ?? 'H2O';
		if (fromUrl !== lastUrlFormula) {
			lastUrlFormula = fromUrl;
			untrack(() => {
				formula = fromUrl;
				compute(fromUrl);
			});
		}
	});

	async function calculate(event?: SubmitEvent) {
		event?.preventDefault();
		if (!compute(formula)) {
			await tick();
			formulaInput?.focus();
			return;
		}
		const url = new URL(effectiveUrl.href);
		url.searchParams.set('formula', result!.formula);
		try {
			await goto(url, { shallow: true, replace: true, reset: false });
		} catch {
			// The calculation remains usable even if updating browser history fails.
		}
	}

	async function useExample(value: string) {
		formula = value;
		await calculate();
	}
</script>

<svelte:head>
	<title>Molar mass calculator | Periodicity</title>
	<meta
		name="description"
		content="Calculate the molar mass and elemental composition of a chemical formula. Supports nested parentheses, brackets, and hydrates."
	/>
</svelte:head>

<div class="page-shell calculator-page">
	<header class="tool-header">
		<div>
			<h1 class="page-heading">Molar mass calculator</h1>
			<p class="text-muted">From a chemical formula to every atom’s contribution.</p>
		</div>
		<a class="button" href="/"><Icon name="table" size={18} /> Periodic table</a>
	</header>

	<section class="calculator-workbench panel" aria-labelledby="formula-heading">
		<div class="formula-workspace">
			<div class="workbench-intro">
				<span class="flask-mark"><Icon name="flask" size={24} /></span>
				<div>
					<h2 id="formula-heading">Start with a formula</h2>
					<p class="text-muted">Use the element symbols exactly as they appear in the table.</p>
				</div>
			</div>
			<form class="formula-form" onsubmit={calculate}>
				<label for="chemical-formula">Chemical formula</label>
				<div class="formula-entry">
					<input
						id="chemical-formula"
						name="formula"
						type="text"
						bind:this={formulaInput}
						bind:value={formula}
						aria-invalid={error ? 'true' : undefined}
						aria-describedby={error ? 'formula-help formula-error' : 'formula-help'}
						placeholder="e.g. Ca(OH)2"
						spellcheck="false"
						autocapitalize="off"
						autocomplete="off"
					/>
					<button class="button button-primary" type="submit"
						>Calculate <Icon name="arrow-right" size={18} /></button
					>
				</div>
				<p id="formula-help" class="formula-help text-muted">
					Supports parentheses, nested groups, and hydrates, such as CuSO4·5H2O. Counts must be
					positive whole numbers.
				</p>
				{#if error}<p id="formula-error" class="formula-error" role="alert">{error}</p>{/if}
			</form>
			<div class="formula-examples">
				<span class="examples-label">Try a formula</span>
				<div class="example-buttons">
					{#each examples as example}
						<button
							type="button"
							onclick={() => useExample(example.formula)}
							aria-label={`Calculate ${example.name}, ${example.formula}`}
							class:active={result?.formula === example.formula && !isChanged}
						>
							<span class="example-formula" aria-hidden="true"
								>{#each formulaFragments(example.formula) as fragment}{#if fragment.subscript}<sub
											>{fragment.text}</sub
										>{:else}{fragment.text}{/if}{/each}</span
							>
							<span class="example-name">{example.name}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>
		<div class="mass-result" class:changed={isChanged}>
			{#if result}
				<div class="result-topline">
					<span>Calculated molar mass</span><span class="result-badge"
						><Icon name="check" size={14} /> {isChanged ? 'Previous result' : 'Calculated'}</span
					>
				</div>
				<div class="result-formula" aria-label={`Formula ${result.formula}`}>
					{#each fragments as fragment}{#if fragment.subscript}<sub>{fragment.text}</sub
							>{:else}{fragment.text}{/if}{/each}
				</div>
				<div class="mass-value">
					<strong>{massFormat.format(result.totalMass)}</strong><span>g/mol</span>
				</div>
				<div class="formula-totals">
					<span
						><strong>{countFormat.format(result.totalAtoms)}</strong>
						{result.totalAtoms === 1 ? 'atom' : 'atoms'} in the formula</span
					><span
						><strong>{result.composition.length}</strong>
						{result.composition.length === 1 ? 'element' : 'elements'}</span
					>
				</div>
				{#if isChanged}<p class="changed-note">
						Formula changed. Select Calculate to update this result.
					</p>{:else}<p class="result-note">The mass of one mole of this formula’s atoms.</p>{/if}
			{:else}
				<div class="result-empty">
					<Icon name="flask" size={40} />
					<h3>Check your formula</h3>
					<p>Correct the highlighted field or choose an example to calculate its molar mass.</p>
				</div>
			{/if}
		</div>
	</section>
	<p class="sr-only" role="status">{notice}</p>

	{#if result}
		<section class="composition-section" aria-labelledby="composition-heading">
			<div class="composition-heading">
				<h2 id="composition-heading">Elemental composition</h2>
				<p class="text-muted">
					Composition of {result.formula}
				</p>
			</div>
			<div class="composition-panel panel">
				<table class="composition-table">
					<caption class="sr-only"
						>Elemental composition of {result.formula}: atom counts, atomic mass, total mass
						contribution, and percentage by mass</caption
					>
					<thead
						><tr
							><th scope="col">Element</th><th scope="col">Atoms</th><th scope="col"
								>Atomic mass <span>(u)</span></th
							><th scope="col">Contribution <span>(g/mol)</span></th><th scope="col"
								>Mass percentage</th
							></tr
						></thead
					>
					<tbody>
						{#each result.composition as entry (entry.element.symbol)}
							<tr
								style={`--element-color: var(--category-${entry.element.category}); --element-bg: var(--category-${entry.element.category}-bg)`}
							>
								<th scope="row"
									><a class="composition-element" href={`/element/${entry.element.number}/`}
										><span class="composition-symbol">{entry.element.symbol}</span><span
											class="composition-name"
											>{entry.element.name}<span class="element-number"
												>Atomic number {entry.element.number}</span
											></span
										></a
									></th
								>
								<td data-label="Atoms">{countFormat.format(entry.count)}</td>
								<td data-label="Atomic mass (u)"
									>{atomicMassFormat.format(entry.element.atomicMass)}</td
								>
								<td data-label="Contribution (g/mol)">{massFormat.format(entry.mass)}</td>
								<td class="percentage-cell" data-label="Mass percentage"
									><div class="percentage-value">{entry.percentage.toFixed(2)}<span>%</span></div>
									<div class="percentage-track" aria-hidden="true">
										<span style={`width: ${entry.percentage}%`}></span>
									</div></td
								>
							</tr>
						{/each}
					</tbody>
					<tfoot
						><tr
							><th scope="row">Total</th><td data-label="Atoms"
								>{countFormat.format(result.totalAtoms)}</td
							><td class="total-placeholder" aria-label="Atomic masses are not summed">—</td><td
								data-label="Molar mass (g/mol)">{massFormat.format(result.totalMass)}</td
							><td data-label="Mass percentage">100.00%</td></tr
						></tfoot
					>
				</table>
			</div>
		</section>
	{/if}

	<section class="calculation-explainer" aria-labelledby="how-it-works-heading">
		<div>
			<h2 id="how-it-works-heading">How the calculation works</h2>
			<p class="text-muted">
				Multiply each element’s atomic mass by its atom count, then add the contributions. Group
				counts apply to every atom inside the group.
			</p>
		</div>
		<div class="calculation-equation">
			<span>Molar mass</span><strong>Σ (atomic mass × atom count)</strong>
			<p class="text-muted">
				Values use this atlas’s atomic masses and are rounded only for display. Representative
				isotope masses are used where an element has no stable isotopes.
			</p>
		</div>
	</section>
</div>

<style>
	.calculator-page {
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
	h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.03em;
	}
	.calculator-workbench {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		overflow: hidden;
	}
	.formula-workspace {
		padding: 34px;
	}
	.workbench-intro {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 30px;
	}
	.flask-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 48px;
		height: 48px;
		border-radius: 12px;
		background: var(--surface-raised);
		color: var(--accent);
	}
	.workbench-intro p {
		margin: 8px 0 0;
		max-width: 44ch;
		font-size: 14px;
		line-height: 1.6;
	}
	.formula-form label {
		display: block;
		margin-bottom: 10px;
		font-size: 14px;
		font-weight: 500;
	}
	.formula-entry {
		display: flex;
		gap: 10px;
	}
	.formula-entry input {
		width: 100%;
		min-width: 0;
		height: 58px;
		padding: 0 18px;
		color: var(--text);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		font-family: var(--font-display);
		font-size: 24px;
		font-weight: 500;
	}
	.formula-entry input[aria-invalid='true'] {
		border-color: var(--danger, #ee9ca9);
	}
	.formula-entry input::placeholder {
		color: var(--muted);
		font-size: 20px;
		font-weight: 400;
	}
	.formula-entry .button {
		flex-shrink: 0;
		min-height: 58px;
		gap: 10px;
	}
	.formula-help {
		margin: 12px 0 0;
		font-size: 13px;
		line-height: 1.7;
		max-width: 65ch;
	}
	.formula-error {
		color: var(--danger, #ee9ca9);
		font-size: 14px;
		line-height: 1.6;
		margin: 12px 0 0;
	}
	.formula-examples {
		margin-top: 28px;
	}
	.examples-label {
		display: block;
		margin-bottom: 12px;
		color: var(--muted);
		font-size: 13px;
	}
	.example-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.example-buttons button {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 6px;
		min-height: 76px;
		padding: 12px 16px;
		text-align: left;
		color: var(--text);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		cursor: pointer;
		font: inherit;
		transition:
			background 150ms,
			border-color 150ms;
	}
	.example-buttons button:hover {
		border-color: var(--accent);
		background: var(--surface-raised);
	}
	.example-buttons button.active {
		border-color: color-mix(in srgb, var(--accent) 65%, var(--border));
		background: color-mix(in srgb, var(--accent) 7%, var(--bg));
	}
	.example-formula {
		font-family: var(--font-display);
		font-size: 20px;
		font-weight: 500;
	}
	.example-name {
		font-size: 12px;
		color: var(--muted);
		line-height: 1.5;
	}
	sub {
		font-size: 0.65em;
		line-height: 0;
		position: relative;
		vertical-align: baseline;
		bottom: -0.2em;
	}
	.mass-result {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 34px;
		background: var(--surface-raised);
		border-left: 1px solid var(--border);
		min-width: 0;
	}
	.result-topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		color: var(--muted);
		font-size: 13px;
	}
	.result-badge {
		display: flex;
		align-items: center;
		gap: 5px;
		white-space: nowrap;
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
		background: color-mix(in srgb, var(--accent) 8%, transparent);
		padding: 5px 9px;
		border-radius: 20px;
		font-size: 11px;
		min-width: 116px;
		justify-content: center;
	}
	.result-formula {
		color: var(--accent);
		font-family: var(--font-display);
		font-weight: 500;
		font-size: clamp(38px, 4.5vw, 64px);
		line-height: 1.2;
		letter-spacing: -0.04em;
		margin: 42px 0 18px;
		overflow-wrap: anywhere;
	}
	.mass-value {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 10px;
	}
	.mass-value strong {
		font-family: var(--font-display);
		font-size: clamp(36px, 4vw, 55px);
		font-weight: 500;
		line-height: 1.15;
		letter-spacing: -0.055em;
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
		min-width: 0;
	}
	.mass-value > span {
		color: var(--muted);
		font-size: 18px;
	}
	.formula-totals {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
		padding-top: 24px;
		margin-top: 30px;
		border-top: 1px solid var(--border);
		font-size: 13px;
		color: var(--muted);
	}
	.formula-totals strong {
		color: var(--text);
		font-weight: 500;
	}
	.result-note,
	.changed-note {
		margin: 12px 0 0;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.6;
		min-height: 3.2em;
	}
	.changed-note {
		color: var(--accent);
	}
	.changed .result-badge {
		color: var(--muted);
		border-color: var(--border);
		background: transparent;
	}
	.result-empty {
		text-align: center;
		color: var(--muted);
		padding: 30px 0;
	}
	.result-empty :global(svg) {
		margin: 0 auto 16px;
	}
	.result-empty h3 {
		color: var(--text);
		font-size: 20px;
		font-weight: 500;
		margin: 0;
	}
	.result-empty p {
		max-width: 32ch;
		margin: 12px auto 0;
		line-height: 1.7;
		font-size: 14px;
	}
	.composition-section {
		margin-top: 36px;
	}
	.composition-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
	}
	.composition-heading p {
		font-size: 14px;
		margin: 0;
		min-height: 1.6em;
		line-height: 1.6;
	}
	.composition-panel {
		overflow: hidden;
	}
	.composition-table {
		border-collapse: collapse;
		width: 100%;
		font-size: 14px;
	}
	.composition-table th,
	.composition-table td {
		text-align: left;
		padding: 22px 24px;
		font-variant-numeric: tabular-nums;
	}
	.composition-table thead th {
		background: var(--surface-raised);
		font-size: 13px;
		color: var(--muted);
		font-weight: 400;
		padding-top: 18px;
		padding-bottom: 18px;
	}
	.composition-table thead th span {
		font-size: 11px;
	}
	.composition-table tbody th,
	.composition-table tbody td {
		border-bottom: 1px solid var(--border);
	}
	.composition-table tbody th {
		font-weight: 400;
	}
	.composition-table tbody tr:hover {
		background: var(--surface-raised);
	}
	.composition-element {
		display: flex;
		align-items: center;
		gap: 14px;
		color: var(--text);
		text-decoration: none;
		width: fit-content;
		border-radius: 4px;
	}
	.composition-element:hover .composition-name {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.composition-symbol {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 50px;
		height: 50px;
		flex-shrink: 0;
		font-family: var(--font-display);
		font-size: 24px;
		font-weight: 500;
		border-radius: 8px;
		color: var(--element-color);
		background: var(--element-bg);
		border: 1px solid color-mix(in srgb, var(--element-color) 30%, var(--border));
	}
	.composition-name {
		display: block;
		font-size: 15px;
		line-height: 1.5;
	}
	.element-number {
		display: block;
		font-size: 12px;
		color: var(--muted);
	}
	.percentage-cell {
		width: 23%;
	}
	.percentage-value {
		margin-bottom: 8px;
	}
	.percentage-value > span {
		color: var(--muted);
		margin-left: 2px;
	}
	.percentage-track {
		height: 5px;
		border-radius: 4px;
		background: var(--bg);
		overflow: hidden;
	}
	.percentage-track > span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--element-color);
	}
	.composition-table tfoot {
		background: var(--surface-raised);
	}
	.composition-table tfoot th {
		font-weight: 500;
	}
	.composition-table tfoot td {
		font-weight: 500;
	}
	.total-placeholder {
		color: var(--muted);
	}
	.calculation-explainer {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 64px;
		margin-top: 36px;
		padding: 30px 4px 0;
		border-top: 1px solid var(--border);
	}
	.calculation-explainer h2 {
		font-size: 18px;
	}
	.calculation-explainer p {
		font-size: 13px;
		line-height: 1.8;
		max-width: 60ch;
		margin: 12px 0 0;
	}
	.calculation-equation > span {
		display: block;
		color: var(--muted);
		font-size: 13px;
		margin-bottom: 8px;
	}
	.calculation-equation > strong {
		font-family: var(--font-display);
		font-size: 21px;
		font-weight: 500;
	}
	input:focus-visible,
	button:focus-visible,
	a:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}
	@media (max-width: 1100px) {
		.calculator-workbench {
			grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
		}
		.formula-workspace,
		.mass-result {
			padding: 26px;
		}
		.formula-entry {
			flex-wrap: wrap;
		}
		.formula-entry .button {
			min-height: 48px;
		}
		.composition-table th,
		.composition-table td {
			padding-left: 16px;
			padding-right: 16px;
		}
		.result-topline {
			flex-wrap: wrap;
		}
	}
	@media (max-width: 760px) {
		.calculator-workbench {
			grid-template-columns: minmax(0, 1fr);
		}
		.formula-workspace,
		.mass-result {
			padding: 24px;
		}
		.mass-result {
			border-left: 0;
			border-top: 1px solid var(--border);
		}
		.workbench-intro {
			gap: 12px;
		}
		.workbench-intro p {
			font-size: 13px;
		}
		.result-topline {
			flex-wrap: nowrap;
		}
		.result-formula {
			margin-top: 26px;
			font-size: 48px;
		}
		.mass-value strong {
			font-size: 48px;
		}
		.formula-totals {
			margin-top: 24px;
			padding-top: 20px;
		}
		.composition-heading {
			display: block;
		}
		.composition-heading p {
			margin-top: 8px;
			line-height: 1.6;
		}
		.composition-table,
		.composition-table tbody,
		.composition-table tfoot {
			display: block;
		}
		.composition-table thead {
			display: none;
		}
		.composition-table tbody tr {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 16px 20px;
			padding: 20px;
			border-bottom: 1px solid var(--border);
		}
		.composition-table th,
		.composition-table td {
			padding: 0;
		}
		.composition-table tbody th,
		.composition-table tbody td {
			border: 0;
		}
		.composition-table tbody th {
			grid-column: 1 / -1;
		}
		.composition-table td::before {
			content: attr(data-label);
			display: block;
			color: var(--muted);
			font-size: 12px;
			font-weight: 400;
			margin-bottom: 6px;
		}
		.composition-table .percentage-cell {
			width: auto;
		}
		.percentage-value {
			margin-bottom: 8px;
		}
		.composition-table tfoot tr {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 16px 20px;
			padding: 20px;
		}
		.composition-table tfoot th {
			grid-column: 1 / -1;
		}
		.composition-table tfoot .total-placeholder {
			display: none;
		}
		.calculation-explainer {
			grid-template-columns: 1fr;
			gap: 24px;
			margin-top: 28px;
		}
	}
	@media (max-width: 440px) {
		.tool-header {
			flex-direction: column;
			gap: 16px;
		}
		.formula-workspace,
		.mass-result {
			padding: 20px;
		}
		.formula-entry .button {
			width: 100%;
		}
		.example-buttons {
			gap: 8px;
		}
		.example-buttons button {
			padding: 12px;
			min-height: 80px;
		}
		.example-formula {
			font-size: 18px;
		}
		.result-topline {
			align-items: flex-start;
		}
		.result-topline > span:first-child {
			max-width: 15ch;
			line-height: 1.6;
		}
		.result-formula,
		.mass-value strong {
			font-size: 42px;
		}
		.calculation-equation > strong {
			font-size: 19px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.example-buttons button {
			transition: none;
		}
	}
</style>

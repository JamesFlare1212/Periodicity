<script lang="ts">
	import Icon from './Icon.svelte';
	import type { Element } from '#lib/data/elements.js';
	import type { MolarMassResult } from '#lib/chemistry/formula.js';

	let {
		selection,
		result,
		onundo,
		onclose
	}: {
		selection: Element[];
		result: MolarMassResult;
		onundo: () => void;
		onclose: () => void;
	} = $props();
	const massFormat = new Intl.NumberFormat('en-US', {
		maximumFractionDigits: 3,
		useGrouping: false
	});
</script>

<section class="mass-addition" aria-label="Quick molar mass calculation">
	<header>
		<h2><Icon name="calculator" size={18} /> Molar mass</h2>
		<div class="mass-actions">
			<button
				type="button"
				class="icon-button"
				aria-label="Undo last atom"
				title="Undo last atom"
				onclick={onundo}><Icon name="arrow-left" size={18} /></button
			>
			<button
				type="button"
				class="icon-button"
				aria-label="Close and clear molar mass calculation"
				title="Close and clear (Escape)"
				onclick={onclose}><Icon name="close" size={18} /></button
			>
		</div>
	</header>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (Long additions can be scrolled with the keyboard.) -->
	<div class="mass-equation" role="region" aria-label="Atomic mass addition" tabindex="0">
		{#each selection as element, index}
			<span class="mass-term">
				{#if index > 0}<span class="operator">+</span>{/if}
				{massFormat.format(element.atomicMass)}
			</span>
		{/each}
	</div>
	<div class="mass-result">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (Long formulas can be scrolled with the keyboard.) -->
		<div class="compound" role="region" aria-label={`Formula ${result.formula}`} tabindex="0">
			{#each result.composition as entry (entry.element.symbol)}
				<span
					>{entry.element.symbol}{#if entry.count > 1}<sub>{entry.count}</sub>{/if}</span
				>
			{/each}
		</div>
		<div class="total">
			<span class="equals" aria-hidden="true">=</span>
			<span class="mass-value">{massFormat.format(result.totalMass)}</span>
			<span class="unit">g/mol</span>
		</div>
	</div>
	<footer>
		<p>
			{result.totalAtoms}
			{result.totalAtoms === 1 ? 'atom' : 'atoms'} · Right-click to add more
		</p>
		<a href={`/calculator/?formula=${encodeURIComponent(result.formula)}`}
			>Full calculator<Icon name="arrow-right" size={14} /></a
		>
	</footer>
</section>

<style>
	.mass-addition {
		height: 100%;
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px 18px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		overflow: hidden;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 15px;
		color: var(--muted);
	}
	.mass-actions {
		display: flex;
		gap: 8px;
	}
	.mass-actions .icon-button {
		border-color: transparent;
		color: var(--muted);
	}
	.mass-equation {
		flex: 1;
		min-height: 28px;
		overflow-y: auto;
		font-size: clamp(14px, 1.5vw, 20px);
		line-height: 1.7;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
		scrollbar-color: var(--border) var(--surface);
		scrollbar-gutter: stable;
	}
	.mass-term {
		display: inline-block;
		white-space: nowrap;
	}
	.operator {
		margin: 0 8px;
	}
	.mass-result {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		font-family: var(--font-display);
	}
	.compound {
		min-width: 0;
		max-height: 1.4em;
		overflow-y: auto;
		display: flex;
		flex-wrap: wrap;
		gap: 0 4px;
		font-size: clamp(20px, 2vw, 28px);
		line-height: 1.4;
		scrollbar-color: var(--border) var(--surface);
		scrollbar-gutter: stable;
	}
	.compound span {
		white-space: nowrap;
	}
	sub {
		font-size: 0.65em;
		/* Keep subscripts from increasing the line box and triggering a scrollbar. */
		line-height: 0;
		vertical-align: baseline;
		position: relative;
		top: 0.25em;
	}
	.total {
		flex-shrink: 0;
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-variant-numeric: tabular-nums;
	}
	.equals {
		font-size: 24px;
		color: var(--muted);
	}
	.mass-value {
		font-size: clamp(26px, 2.8vw, 38px);
		line-height: 1.2;
		color: var(--accent);
	}
	.unit {
		font-size: 12px;
		color: var(--muted);
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 11px;
		color: var(--muted);
	}
	footer a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		color: var(--accent);
		white-space: nowrap;
	}
	footer a:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	@media (max-width: 1000px) {
		.mass-addition {
			height: 100%;
		}
		.mass-equation {
			font-size: 16px;
		}
		.mass-result {
			margin-top: auto;
		}
		.compound {
			height: 2.8em;
			max-height: 2.8em;
		}
	}
	@media (max-width: 600px) {
		.mass-addition {
			padding: 12px 14px;
		}
		.mass-result {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 6px;
		}
		.total {
			margin-left: auto;
		}
		footer {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: center;
		}
		footer p {
			line-height: 1.5;
			min-height: 3em;
		}
	}
</style>

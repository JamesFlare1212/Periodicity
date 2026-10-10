<script lang="ts">
	import { categoryById, getPhaseAtTemperature, type Element } from '#lib/data/elements.js';
	import { getElementDisplay, type ElementDisplay } from '#lib/element-display.js';
	import Atom from '#lib/components/Atom.svelte';
	import ElectronConfiguration from '#lib/components/ElectronConfiguration.svelte';
	import Icon from '#lib/components/Icon.svelte';
	let {
		element,
		display = 'families',
		temperature = 298.15,
		onconfiguration
	}: {
		element: Element;
		display?: ElementDisplay;
		temperature?: number;
		onconfiguration?: (element: Element) => void;
	} = $props();
	let category = $derived(categoryById[element.category]);
	let phase = $derived(getPhaseAtTemperature(element, temperature));
	let presentation = $derived(getElementDisplay(element, display, temperature));
	let description = $derived(
		element.summary
			.split(/(?<=\.)\s+/)
			.slice(0, 2)
			.join(' ')
	);
</script>

<div
	class="preview"
	style={`--element-color:${presentation.color};--element-background:${presentation.background};--family-color:${category.color}`}
>
	<div class="specimen" class:unknown={presentation.unknown}>
		<span class="specimen-number">{element.number}</span><span class="specimen-symbol"
			>{element.symbol}</span
		><span class="specimen-mass">{element.atomicMass}</span>
	</div>
	<div class="preview-copy">
		<div class="preview-name">
			<h2>{element.name}</h2>
			<span class="family"><i></i>{category.label}</span>
		</div>
		<p class="description">{description}</p>
		<div class="preview-properties">
			{#if display !== 'families'}
				<span class="active-property">
					<b class:phase={display === 'phase'}
						>{presentation.value}{#if presentation.unit}
							{' '}<span class="property-unit">{presentation.unit}</span>{/if}</b
					>
					{presentation.label}
				</span>
			{/if}
			<span
				><b><ElectronConfiguration configuration={element.electronConfiguration} /></b>Electron
				configuration</span
			>
			{#if display !== 'phase'}
				<span><b class="phase">{phase}</b>State at {Math.round(temperature)} K</span>
			{/if}
		</div>
		<div class="preview-actions">
			{#if onconfiguration}
				<button
					type="button"
					class="configuration-link"
					onclick={() => onconfiguration?.(element)}
					aria-haspopup="dialog">Full configuration</button
				>
			{/if}
			<a class="details-link" href={`/element/${element.number}/`}
				>Explore {element.name.toLowerCase()}<Icon name="arrow-right" size={16} /></a
			>
		</div>
	</div>
	<div class="preview-atom">
		<Atom {element} compact color={presentation.color} background={presentation.background} />
	</div>
</div>

<style>
	.preview {
		display: grid;
		grid-template-columns: 99px minmax(0, 1fr) 140px;
		align-items: center;
		gap: 22px;
		height: 100%;
		padding: 18px 18px 18px 8px;
	}
	.specimen {
		align-self: center;
		height: 126px;
		width: 99px;
		display: flex;
		flex-direction: column;
		color: var(--element-color);
		border: 1px solid color-mix(in srgb, var(--element-color) 35%, transparent);
		border-radius: 8px;
		background: var(--element-background);
		padding: 9px 11px;
	}
	.specimen.unknown {
		opacity: 0.5;
	}
	.specimen-number {
		font-size: 13px;
	}
	.specimen-symbol {
		font-family: var(--font-display);
		font-size: 62px;
		line-height: 1;
		font-weight: 500;
		text-align: center;
		margin: 5px 0 8px;
		letter-spacing: -0.06em;
	}
	.specimen-mass {
		text-align: center;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.preview-name {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 12px;
	}
	.preview-name h2 {
		font-size: 27px;
		letter-spacing: -0.04em;
	}
	.family {
		color: var(--family-color);
		font-size: 11px;
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.family i {
		width: 5px;
		height: 5px;
		background: currentColor;
		border-radius: 50%;
	}
	.description {
		margin-top: 9px;
		font-size: 12px;
		line-height: 1.55;
		color: var(--muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 3.1em;
	}
	.preview-properties {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 16px;
		margin: 12px 0;
		font-size: 10px;
		color: var(--muted);
	}
	.preview-properties > span {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.preview-properties b {
		color: var(--text);
		font-size: 12px;
		font-weight: 400;
	}
	.preview-properties .active-property b {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.property-unit {
		font-size: 10px;
		font-weight: 400;
	}
	.phase {
		text-transform: capitalize;
	}
	.preview-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0 20px;
	}
	.configuration-link {
		min-height: 44px;
		padding: 0;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var(--element-color);
		font-size: 12px;
	}
	.configuration-link:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.details-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--element-color);
		min-height: 30px;
	}
	.details-link:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.preview-atom {
		opacity: 0.75;
	}
	@media (max-width: 1400px) {
		.preview {
			grid-template-columns: 99px minmax(0, 1fr);
		}
		.preview-atom {
			display: none;
		}
	}
	@media (max-width: 1200px) {
		.preview {
			grid-template-columns: 85px minmax(0, 1fr);
			gap: 18px;
			padding-block: 8px;
		}
		.specimen {
			width: 85px;
			height: 112px;
		}
		.specimen-symbol {
			font-size: 52px;
		}
		.preview-name h2 {
			font-size: 24px;
		}
		.preview-properties {
			gap: 10px 12px;
		}
	}
	@media (max-width: 760px) {
		.preview {
			padding: 18px;
			gap: 16px;
		}
		.preview-name {
			gap: 5px;
			min-height: 52px;
			align-content: start;
		}
		.preview-name h2 {
			font-size: clamp(20px, 6vw, 24px);
			overflow-wrap: anywhere;
		}
		.description {
			font-size: 12px;
		}
		.preview-properties {
			gap: 10px 12px;
			/* Reserve two rows when the active property joins the other facts. */
			min-height: 79px;
		}
		.preview-properties > span {
			font-size: 10px;
		}
		.preview-properties b {
			font-size: 11px;
		}
		.details-link {
			min-height: 36px;
		}
		.preview-actions {
			min-height: 80px;
			align-content: start;
		}
		.specimen {
			align-self: start;
			margin-top: 3px;
		}
	}
	@media (max-width: 360px) {
		.preview-properties {
			/* Narrow screens can wrap all three facts onto separate rows. */
			min-height: 123.5px;
		}
	}
</style>

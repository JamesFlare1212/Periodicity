<script lang="ts">
	import { type Element } from '#lib/data/elements.js';
	import ElementButton from './ElementButton.svelte';
	import { getElementDisplay, type ElementDisplay } from '#lib/element-display.js';
	let {
		element,
		selected = false,
		dimmed = false,
		display = 'families',
		temperature = 298.15,
		onselect,
		onadd,
		onpreview,
		onleave
	}: {
		element: Element;
		selected?: boolean;
		dimmed?: boolean;
		display?: ElementDisplay;
		temperature?: number;
		onselect: (element: Element) => void;
		onadd?: (element: Element, trigger: HTMLButtonElement) => void;
		onpreview: (element: Element) => void;
		onleave: () => void;
	} = $props();
	let presentation = $derived(getElementDisplay(element, display, temperature));
	let bottom = $derived(display === 'families' ? String(element.atomicMass) : presentation.value);
	let metric = $derived(
		display === 'families'
			? `Atomic mass ${element.atomicMass}`
			: `${presentation.label}: ${bottom}${presentation.unit ? ` ${presentation.unit}` : ''}`
	);
</script>

<ElementButton
	{element}
	{selected}
	{dimmed}
	unknown={presentation.unknown}
	color={presentation.color}
	background={presentation.background}
	value={bottom}
	aria-label={`${element.number}. ${element.name}, ${element.symbol}. ${metric}. ${selected ? 'View element details' : 'Lock element preview'}${onadd ? '. Right-click or Shift+Enter to add to molar mass' : ''}`}
	aria-pressed={selected}
	aria-keyshortcuts={onadd ? 'Shift+Enter' : undefined}
	onclick={() => onselect(element)}
	oncontextmenu={(event) => {
		if (!onadd) return;
		event.preventDefault();
		onadd(element, event.currentTarget);
	}}
	onkeydown={(event) => {
		if (onadd && event.key === 'Enter' && event.shiftKey) {
			event.preventDefault();
			onadd(element, event.currentTarget);
		}
	}}
	onpointerenter={(event) => {
		if (event.pointerType === 'mouse') onpreview(element);
	}}
	onmouseleave={onleave}
	onfocus={(event) => {
		if (event.currentTarget.matches(':focus-visible')) onpreview(element);
	}}
	onblur={onleave}
/>

<script lang="ts">
	import Icon from './Icon.svelte';
	let {
		value,
		onchange
	}: {
		value: 'grid' | 'table';
		onchange: (value: 'grid' | 'table') => void;
	} = $props();
</script>

<div class="layout-switch" role="group" aria-label="Element layout">
	<button
		type="button"
		class:active={value === 'grid'}
		aria-label="Grid view"
		aria-pressed={value === 'grid'}
		onclick={() => onchange('grid')}><Icon name="grid" size={17} /></button
	>
	<button
		type="button"
		class:active={value === 'table'}
		aria-label="Periodic table view"
		aria-pressed={value === 'table'}
		onclick={() => onchange('table')}><Icon name="table" size={17} /></button
	>
</div>

<style>
	.layout-switch {
		display: flex;
		flex-shrink: 0;
		padding: 2px;
		border: 1px solid var(--border);
		border-radius: 7px;
	}
	button {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var(--muted);
	}
	button.active {
		background: var(--accent-soft);
		color: var(--accent);
	}
</style>

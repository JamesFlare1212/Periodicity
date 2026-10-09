<script lang="ts">
	import type { Element } from '#lib/data/elements.js';

	interface Props {
		element: Element;
		compact?: boolean;
	}

	let { element, compact = false }: Props = $props();
	const shellNames = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];
	let shells = $derived(element.shells.filter((count) => count > 0));

	function radius(index: number) {
		return shells.length === 1 ? 112 : 63 + (index / (shells.length - 1)) * 93;
	}

	function electronPosition(shell: number, electron: number, count: number) {
		const angle = (electron / count) * Math.PI * 2 - Math.PI / 2 + shell * 0.38;
		return { x: 180 + Math.cos(angle) * radius(shell), y: 180 + Math.sin(angle) * radius(shell) };
	}
</script>

<figure
	class="atom"
	class:compact
	style={`--element-color: var(--category-${element.category}); --element-bg: var(--category-${element.category}-bg)`}
>
	<svg
		viewBox="0 0 360 360"
		role="img"
		aria-label={`${element.name} has ${element.number} electrons distributed across ${shells.length} shells: ${shells.join(', ')}.`}
	>
		<title>{element.name} electron shells</title>
		{#each shells as count, shell}
			<circle class="orbit" cx="180" cy="180" r={radius(shell)} />
			{#each Array.from({ length: count }) as _, electron}
				{@const position = electronPosition(shell, electron, count)}
				<circle
					class="electron"
					cx={position.x}
					cy={position.y}
					r={shells.length > 5 ? 2.8 : 3.4}
				/>
			{/each}
		{/each}
		<circle class="nucleus" cx="180" cy="180" r="39" />
		<text class="nucleus-symbol" x="180" y="183" text-anchor="middle">{element.symbol}</text>
		<text class="nucleus-number" x="180" y="202" text-anchor="middle">{element.number} protons</text
		>
	</svg>
	{#if !compact}
		<div class="shell-key" aria-label="Electrons per shell">
			{#each shells as count, index}
				<span
					><span class="shell-name">{shellNames[index] ?? index + 1}</span><strong>{count}</strong
					></span
				>
			{/each}
		</div>
		<figcaption>A simplified shell model. Electron positions are illustrative.</figcaption>
	{/if}
</figure>

<style>
	.atom {
		margin: 0;
		width: 100%;
	}
	svg {
		display: block;
		width: min(100%, 360px);
		height: auto;
		margin: 0 auto;
		overflow: visible;
	}
	.orbit {
		stroke: var(--muted);
		stroke-opacity: 0.42;
		stroke-width: 0.9;
		fill: none;
	}
	.electron {
		fill: var(--element-color, var(--accent));
	}
	.nucleus {
		fill: var(--element-bg, var(--surface-raised));
		stroke: var(--element-color, var(--accent));
		stroke-width: 1;
	}
	.nucleus-symbol {
		fill: var(--element-color, var(--accent));
		font-family: var(--font-display);
		font-size: 31px;
		font-weight: 600;
	}
	.nucleus-number {
		fill: var(--muted);
		font-family: 'DM Sans Variable', sans-serif;
		font-size: 9px;
	}
	.shell-key {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px;
		margin-top: 4px;
	}
	.shell-key > span {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		background: var(--surface-raised);
		border-radius: 5px;
		padding: 5px 8px;
		font-size: 12px;
	}
	.shell-name {
		color: var(--muted);
	}
	strong {
		color: var(--text);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	figcaption {
		margin: 13px auto 0;
		max-width: 32ch;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.6;
		text-align: center;
	}
</style>

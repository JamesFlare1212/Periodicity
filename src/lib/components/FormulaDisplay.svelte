<script lang="ts">
	import { formulaFragments, normalizeFormula } from '#lib/chemistry/formula.js';

	let { formula, wrapAtoms = false }: { formula: string; wrapAtoms?: boolean } = $props();
	let groups = $derived(
		wrapAtoms
			? (normalizeFormula(formula)
					.replace(/\s+/g, '')
					.match(/[A-Z][a-z]?\d*|[^A-Z]+/g) ?? [])
			: [formula]
	);
</script>

{#snippet fragments(text: string)}
	{#each formulaFragments(text) as fragment}
		{#if fragment.subscript}<sub>{fragment.text}</sub>{:else}{fragment.text}{/if}
	{/each}
{/snippet}

{#each groups as group}
	{#if wrapAtoms}<span class="atom">{@render fragments(group)}</span>
	{:else}{@render fragments(group)}{/if}
{/each}

<style>
	.atom {
		white-space: nowrap;
	}
	sub {
		font-size: 0.65em;
		/* Keep chemical subscripts inside the parent's line box. */
		line-height: 0;
		vertical-align: baseline;
		position: relative;
		top: var(--formula-sub-offset, 0.2em);
	}
</style>

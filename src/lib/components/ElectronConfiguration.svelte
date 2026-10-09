<script lang="ts">
	let { configuration }: { configuration: string } = $props();
	let parts = $derived(configuration.split(/(\d[spdf]\d+)/g));
</script>

{#if configuration}
	{#each parts as part}
		{@const orbital = part.match(/^(\d[spdf])(\d+)$/)}
		{#if orbital}<span class="orbital"
				><span aria-hidden="true">{orbital[1]}<sup>{orbital[2]}</sup></span><span class="sr-only"
					>{orbital[1]}, {orbital[2]} electrons;
				</span></span
			>{:else}{part}{/if}
	{/each}
{:else}
	Not available
{/if}

<style>
	.orbital {
		white-space: nowrap;
	}
	.sr-only {
		user-select: none;
	}
	.orbital sup {
		font-size: 0.65em;
		line-height: 0;
		vertical-align: super;
	}
</style>

<script lang="ts">
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
</script>

<svelte:head><title>{page.status} | Periodicity</title></svelte:head>
<div class="page-shell error-page">
	<Icon name="atom" size={60} />
	<p class="text-muted">{page.status}</p>
	<h1 class="page-heading">
		{page.status === 404 ? 'This element of the site is missing.' : 'The page could not be loaded.'}
	</h1>
	<p class="text-muted">
		{page.status === 404
			? 'Explore the periodic table to find what you’re looking for.'
			: 'Reload the page or return to the periodic table.'}
	</p>
	<a href="/" class="button button-primary"
		>Explore the elements <Icon name="arrow-right" size={18} /></a
	>
</div>

<style>
	.error-page {
		min-height: 65dvh;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 20px;
	}
	.error-page > :global(svg) {
		color: var(--accent);
	}
	.error-page h1 {
		max-width: 650px;
	}
</style>

<script lang="ts">
	import type { Element } from '#lib/data/elements.js';
	import {
		configurationText,
		getElectronConfiguration,
		orbitalNotation,
		type ConfigurationView
	} from '#lib/chemistry/electron-configuration.js';
	import ElectronConfiguration from './ElectronConfiguration.svelte';
	import Icon from './Icon.svelte';

	let {
		element,
		view = $bindable<ConfigurationView>('full'),
		onviewchange
	}: {
		element: Element;
		view?: ConfigurationView;
		onviewchange?: (view: ConfigurationView) => void;
	} = $props();
	const views: Array<{ id: ConfigurationView; label: string }> = [
		{ id: 'short', label: 'Short' },
		{ id: 'full', label: 'Full' },
		{ id: 'shell', label: 'By shell' }
	];
	let result = $derived(getElectronConfiguration(element));
	let activeView = $derived(result.status === 'available' ? view : 'short');
	let copyText = $derived(configurationText(result, activeView));
	let context = $derived(`${element.number}:${activeView}:${copyText}`);
	let feedback = $state<{ context: string; message: string; success: boolean } | null>(null);
	let pending = $state<string | null>(null);
	let notice = $derived(feedback?.context === context ? feedback : null);
	let copyRevision = 0;
	$effect(() => {
		context;
		copyRevision++;
		feedback = null;
		pending = null;
	});

	function setView(next: ConfigurationView) {
		view = next;
		feedback = null;
		onviewchange?.(next);
	}
	async function copy() {
		const requestedContext = context;
		const revision = copyRevision;
		pending = requestedContext;
		try {
			await navigator.clipboard.writeText(copyText);
			if (revision !== copyRevision) return;
			feedback = { context: requestedContext, message: 'Configuration copied.', success: true };
		} catch {
			if (revision !== copyRevision) return;
			feedback = {
				context: requestedContext,
				message: 'Copy unavailable. Select the configuration and copy it.',
				success: false
			};
		} finally {
			if (revision === copyRevision && pending === requestedContext) pending = null;
		}
	}
</script>

<div
	class="configuration-viewer"
	style={`--configuration-color:var(--category-${element.category})`}
>
	<div class="viewer-toolbar">
		<div class="view-switch" role="group" aria-label="Electron configuration view">
			{#each views as item}
				<button
					type="button"
					aria-pressed={activeView === item.id}
					disabled={result.status === 'unavailable' && item.id !== 'short'}
					onclick={() => setView(item.id)}>{item.label}</button
				>
			{/each}
		</div>
		<button
			type="button"
			class="copy-button button"
			onclick={copy}
			disabled={!copyText || pending === context}
		>
			<Icon name={notice?.success ? 'check' : 'copy'} size={16} />
			{pending === context ? 'Copying…' : notice?.success ? 'Copied' : 'Copy'}
		</button>
	</div>
	<div class="configuration-content">
		<p class="view-label">
			{activeView === 'short'
				? 'Short electron configuration'
				: activeView === 'full'
					? 'Full electron configuration'
					: 'Grouped by principal shell'}
		</p>
		{#if result.status === 'unavailable' || activeView === 'short'}
			<div class="configuration-formula">
				<ElectronConfiguration configuration={result.short} />
			</div>
		{:else if activeView === 'full'}
			<div class="configuration-formula">
				{#each result.orbitals as orbital}
					<span class:core={orbital.core} class="orbital"
						><ElectronConfiguration configuration={orbitalNotation(orbital)} /></span
					>{' '}
				{/each}
			</div>
		{:else}
			<div class="shells">
				{#each result.shells as shell}
					<div class="shell-row">
						<span class="shell-label">n = {shell.n}</span>
						<div class="configuration-formula">
							{#each shell.orbitals as orbital}
								<span class:core={orbital.core} class="orbital"
									><ElectronConfiguration configuration={orbitalNotation(orbital)} /></span
								>{' '}
							{/each}
						</div>
						<span class="shell-count"
							>{shell.electrons} <span aria-hidden="true">e⁻</span><span class="sr-only"
								>electrons</span
							></span
						>
					</div>
				{/each}
			</div>
		{/if}
		<p class="explanation">
			{#if result.status === 'unavailable'}
				{result.reason} The original notation is shown.
			{:else if result.coreSymbol}
				<strong>[{result.coreSymbol}]</strong> represents {result.coreElectrons} core electrons.
				{#if activeView === 'full'}
					The full view shows them explicitly.{/if}
			{:else}
				All electrons are already written explicitly.
			{/if}
		</p>
	</div>
	{#if result.status === 'available'}
		<div class="configuration-summary">
			<span><strong>{result.totalElectrons}</strong> electrons</span>
			<span
				>{activeView === 'shell'
					? 'Shell grouping, not filling order'
					: 'Orbital order preserved from source'}</span
			>
		</div>
		{#if activeView === 'shell' && !result.shellsMatch}
			<p class="reference-note">
				These shell counts follow the configuration above. The shell diagram uses a different
				reference record.
			</p>
		{/if}
	{/if}
	<p class="copy-feedback" role="status" aria-live="polite">{notice?.message ?? ''}</p>
</div>

<style>
	.configuration-viewer {
		min-width: 0;
	}
	.viewer-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 18px;
	}
	.view-switch {
		display: flex;
		gap: 4px;
		padding: 4px;
		border: 1px solid var(--border);
		border-radius: 9px;
		background: var(--bg);
	}
	.view-switch button {
		min-height: 44px;
		padding: 5px 12px;
		font-size: 13px;
		border: 1px solid transparent;
		border-radius: 5px;
		background: transparent;
		color: var(--muted);
	}
	.view-switch button:hover:not(:disabled) {
		color: var(--text);
	}
	.view-switch button[aria-pressed='true'] {
		background: var(--surface-raised);
		border-color: var(--border);
		color: var(--text);
	}
	.copy-button {
		font-size: 13px;
		padding: 8px 12px;
		background: transparent;
	}
	.configuration-content {
		padding: 20px;
		border-radius: 8px;
		background: var(--surface-raised);
	}
	.view-label {
		color: var(--muted);
		font-size: 12px;
		margin-bottom: 12px;
	}
	.configuration-formula {
		font-family: var(--font-display);
		font-size: 26px;
		line-height: 1.8;
		font-weight: 500;
		color: var(--configuration-color);
		overflow-wrap: anywhere;
	}
	.orbital {
		display: inline-block;
		white-space: nowrap;
		margin-right: 0.25em;
	}
	.orbital.core {
		color: var(--text);
	}
	.explanation {
		margin-top: 16px;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.7;
	}
	.explanation strong {
		color: var(--text);
		font-weight: 500;
	}
	.configuration-summary {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 6px 12px;
		padding-top: 16px;
		color: var(--muted);
		font-size: 12px;
	}
	.configuration-summary strong {
		color: var(--text);
		font-weight: 500;
	}
	.shell-row {
		display: grid;
		grid-template-columns: 48px minmax(0, 1fr) 56px;
		gap: 10px;
		align-items: baseline;
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
	}
	.shell-row:first-child {
		padding-top: 0;
	}
	.shell-row:last-child {
		padding-bottom: 0;
		border: 0;
	}
	.shell-label {
		color: var(--muted);
		font-size: 13px;
	}
	.shell-row .configuration-formula {
		font-size: 21px;
	}
	.shell-count {
		text-align: right;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}
	.copy-feedback {
		min-height: 1.7em;
		padding-top: 8px;
		font-size: 12px;
		color: var(--muted);
	}
	.reference-note {
		margin-top: 12px;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.7;
	}
	@media (max-width: 600px) {
		.configuration-content {
			padding: 16px;
		}
		.configuration-formula {
			font-size: 22px;
		}
		.shell-row {
			grid-template-columns: 42px minmax(0, 1fr);
			gap: 4px 8px;
		}
		.shell-count {
			grid-column: 2;
			text-align: left;
			color: var(--muted);
		}
		.shell-row .configuration-formula {
			font-size: 20px;
		}
	}
</style>

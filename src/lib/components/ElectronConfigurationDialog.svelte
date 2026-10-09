<script lang="ts">
	import { onMount } from 'svelte';
	import type { Element } from '#lib/data/elements.js';
	import ElectronConfigurationViewer from './ElectronConfigurationViewer.svelte';
	import Icon from './Icon.svelte';
	let { element, onclose }: { element: Element; onclose: () => void } = $props();
	let dialog: HTMLDialogElement;
	const titleId = $props.id();
	let backdropPressed = false;

	function trapFocus(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;
		const controls = Array.from(
			dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')
		);
		const first = controls[0];
		const last = controls.at(-1);
		if (event.shiftKey && document.activeElement === first && last) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last && first) {
			event.preventDefault();
			first.focus();
		}
	}

	function outside(event: MouseEvent | PointerEvent) {
		const rect = dialog.getBoundingClientRect();
		return (
			event.target === dialog &&
			(event.clientX < rect.left ||
				event.clientX > rect.right ||
				event.clientY < rect.top ||
				event.clientY > rect.bottom)
		);
	}
	onMount(() => {
		const trigger = document.activeElement;
		const overflow = document.body.style.overflow;
		dialog.showModal();
		document.body.style.overflow = 'hidden';
		return () => {
			if (dialog.open) dialog.close();
			document.body.style.overflow = overflow;
			if (trigger instanceof HTMLElement && trigger.isConnected)
				trigger.focus({ preventScroll: true });
		};
	});
</script>

<dialog
	bind:this={dialog}
	aria-labelledby={titleId}
	oncancel={(event) => {
		event.preventDefault();
		onclose();
	}}
	{onclose}
	onkeydown={trapFocus}
	onpointerdown={(event) => (backdropPressed = outside(event))}
	onclick={(event) => {
		if (backdropPressed && outside(event)) onclose();
	}}
>
	<div class="dialog-header">
		<div>
			<h2 id={titleId}>{element.symbol} · {element.name}</h2>
			<p>Electron configuration</p>
		</div>
		<button type="button" class="button close-button" onclick={onclose}
			><Icon name="close" size={16} />Close</button
		>
	</div>
	<ElectronConfigurationViewer {element} />
	<a
		class="element-link"
		href={`/element/${element.number}/?configuration=full#electronic-heading`}
	>
		Open element page<Icon name="arrow-right" size={16} />
	</a>
</dialog>

<style>
	dialog {
		width: min(640px, calc(100% - 32px));
		max-height: 85dvh;
		padding: 28px;
		overflow-y: auto;
		overscroll-behavior: contain;
		border: 1px solid var(--border);
		border-radius: 14px;
		background: var(--surface);
		color: var(--text);
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 65%);
	}
	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 24px;
	}
	h2 {
		font-size: 24px;
		letter-spacing: -0.5px;
	}
	.dialog-header p {
		color: var(--muted);
		font-size: 12px;
		margin-top: 6px;
	}
	.close-button {
		flex-shrink: 0;
		background: transparent;
		font-size: 13px;
	}
	.element-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		font-size: 13px;
		color: var(--accent);
	}
	.element-link:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	@media (max-width: 600px) {
		dialog {
			width: 100%;
			max-width: 100%;
			margin: auto 0 0;
			padding: 20px 16px max(20px, env(safe-area-inset-bottom));
			border-radius: 16px 16px 0 0;
		}
		h2 {
			font-size: 22px;
		}
	}
</style>

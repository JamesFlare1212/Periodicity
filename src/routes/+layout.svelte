<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import { restoreTheme, saveTheme, type Theme } from '#lib/theme.js';
	let { children } = $props();
	let theme = $state<Theme>('dark');
	onMount(() => {
		theme = restoreTheme();
		void tick().then(() => {
			document.documentElement.removeAttribute('data-initial-view');
			document.documentElement.dataset.appReady = 'true';
		});
	});
	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		saveTheme(theme);
	}
	const navigation: { href: string; label: string; icon: IconName }[] = [
		{ href: '/', label: 'Explore', icon: 'table' },
		{ href: '/trends/', label: 'Trends', icon: 'chart' },
		{ href: '/compare/', label: 'Compare', icon: 'compare' }
	];
</script>

<svelte:head
	><meta
		name="description"
		content="Explore all 118 chemical elements. Discover periodic trends, compare properties, and calculate molecular mass with Periodicity."
	/></svelte:head
>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
	<div class="header-inner">
		<a class="brand" href="/" aria-label="Periodicity home"
			><img class="brand-mark" src="/favicon.ico" width="28" height="28" alt="" /><span
				>periodicity<span class="brand-dot">.</span></span
			></a
		>
		<nav aria-label="Main navigation">
			{#each navigation as item}<a
					href={item.href}
					class:active={item.href === '/'
						? page.url.pathname === '/' || page.url.pathname.startsWith('/element/')
						: page.url.pathname.startsWith(item.href)}
					aria-current={item.href === '/'
						? page.url.pathname === '/'
							? 'page'
							: undefined
						: page.url.pathname.startsWith(item.href)
							? 'page'
							: undefined}><Icon name={item.icon} size={17} />{item.label}</a
				>{/each}
		</nav>
		<div class="header-tools">
			<a
				class="calculator-link"
				class:active={page.url.pathname.startsWith('/calculator/')}
				href="/calculator/"
				aria-label="Molecular mass calculator"
				><Icon name="flask" size={18} /><span>Mass calculator</span></a
			><span class="tool-divider"></span><button
				class="theme-toggle icon-button"
				onclick={toggleTheme}
				aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} appearance`}
				><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} /></button
			>
		</div>
	</div>
</header>
<main id="main" tabindex="-1">{@render children()}</main>
<footer class="site-footer">
	<div>
		<span class="footer-brand">periodicity.</span><span>A little curiosity goes a long way.</span>
	</div>
	<div>
		<a href="https://github.com/JamesFlare1212/Periodicity" target="_blank" rel="noreferrer"
			>Open source <Icon name="external" size={13} /></a
		><a href="https://github.com/Bowserinator/Periodic-Table-JSON" target="_blank" rel="noreferrer"
			>Element data <Icon name="external" size={13} /></a
		>
	</div>
</footer>

<style>
	.site-header {
		border-bottom: 1px solid var(--border);
	}
	.header-inner {
		max-width: 1480px;
		min-height: 86px;
		padding: 0 44px;
		margin: auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 11px;
		font-family: var(--font-display);
		font-size: 25px;
		font-weight: 600;
		letter-spacing: -0.055em;
	}
	.brand-mark {
		display: block;
		flex-shrink: 0;
	}
	.brand-dot {
		color: var(--accent);
	}
	nav {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	nav a {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 10px 17px;
		font-size: 14px;
		color: var(--muted);
		border-radius: 7px;
	}
	nav a:hover {
		color: var(--text);
		background: var(--surface);
	}
	nav a.active {
		color: var(--accent);
		background: var(--accent-soft);
	}
	.header-tools {
		display: flex;
		align-items: center;
		gap: 18px;
	}
	.calculator-link {
		display: flex;
		align-items: center;
		gap: 9px;
		min-height: 44px;
		min-width: 44px;
		justify-content: center;
		color: var(--muted);
		font-size: 13px;
	}
	.calculator-link:hover,
	.calculator-link.active {
		color: var(--accent);
	}
	.tool-divider {
		height: 23px;
		width: 1px;
		background: var(--border);
	}
	.theme-toggle {
		border: 0;
		color: var(--muted);
	}
	.site-footer {
		max-width: 1480px;
		margin: auto;
		padding: 24px 44px 30px;
		border-top: 1px solid var(--border);
		display: flex;
		justify-content: space-between;
		gap: 24px;
		color: var(--muted);
		font-size: 12px;
	}
	.site-footer > div {
		display: flex;
		align-items: center;
		gap: 24px;
	}
	.footer-brand {
		color: var(--text);
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 500;
	}
	.site-footer a {
		display: flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
	}
	.site-footer a:hover {
		color: var(--accent);
	}
	@media (max-width: 1000px) {
		.header-inner {
			padding: 0 24px;
		}
		.calculator-link span {
			display: none;
		}
		.site-footer {
			padding: 20px 24px;
		}
	}
	@media (max-width: 760px) {
		.header-inner {
			flex-wrap: wrap;
			min-height: 116px;
			padding: 15px 16px 10px;
			gap: 10px;
		}
		.brand {
			font-size: 23px;
		}
		.header-tools {
			gap: 4px;
		}
		.tool-divider {
			display: none;
		}
		nav {
			order: 3;
			width: 100%;
			gap: 8px;
		}
		nav a {
			flex: 1;
			justify-content: center;
			padding: 8px 12px;
		}
		.site-footer {
			padding: 20px 16px;
			flex-direction: column;
			gap: 4px;
		}
		.site-footer > div {
			justify-content: space-between;
			gap: 12px;
		}
		.site-footer > div:first-child > span:last-child {
			font-size: 11px;
		}
	}
	@media (max-width: 360px) {
		nav {
			gap: 4px;
		}
		nav a {
			gap: 6px;
			padding-inline: 6px;
		}
	}
</style>

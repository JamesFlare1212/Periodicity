<script lang="ts">
	let { name, size = 20, ...rest }: { name: string; size?: number; class?: string } = $props();
	const paths: Record<string, string> = {
		search: 'm21 21-4.5-4.5M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
		sun: 'M12 3V1m0 22v-2M3 12H1m22 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
		moon: 'M21 13.2A9 9 0 0 1 10.8 3 9 9 0 1 0 21 13.2Z',
		table: 'M3 3h18v18H3ZM3 9h18M3 15h18M9 3v18M15 3v18',
		grid: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
		chart: 'M3 3v18h18M7 14l4-5 4 3 6-8',
		compare: 'M4 3v18M20 3v18M8 7h8m-3-3 3 3-3 3M16 17H8m3-3-3 3 3 3',
		flask: 'M9 3h6M10 3v7l-6.6 9.1A1.8 1.8 0 0 0 5 22h14a1.8 1.8 0 0 0 1.6-2.9L14 10V3M7 15h10',
		calculator:
			'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM8 6h8M8 11h1m6 0h1M8 15h1m6 0h1M8 19h1m6 0h1',
		'arrow-left': 'M20 12H4m6-6-6 6 6 6',
		'arrow-right': 'M4 12h16m-6-6 6 6-6 6',
		'chevron-down': 'm6 9 6 6 6-6',
		'chevron-right': 'm9 6 6 6-6 6',
		plus: 'M12 5v14M5 12h14',
		minus: 'M5 12h14',
		close: 'm6 6 12 12M6 18 18 6',
		check: 'm5 12 4 4L19 6',
		external: 'M15 3h6v6m0-6L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
		info: 'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
		temperature: 'M9 15.5V5a3 3 0 0 1 6 0v10.5a5 5 0 1 1-6 0ZM12 10v9',
		reset: 'M3 10a9 9 0 1 1 2.4 8M3 4v6h6',
		github:
			'M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-2.7c3.3-.4 6.7-1.6 6.7-7.3A5.7 5.7 0 0 0 19 4a5.3 5.3 0 0 0-.1-4S17.6-.4 15 1.5a13.4 13.4 0 0 0-6 0C6.4-.4 5.1 0 5.1 0A5.3 5.3 0 0 0 5 4a5.7 5.7 0 0 0-1.7 4C3.3 13.7 6.7 14.9 10 15.3A3.5 3.5 0 0 0 9 18v4',
		atom: 'M12 12h.01M20.5 3.5c2 2-0.2 7.4-4.9 12.1s-10.1 6.9-12.1 4.9.2-7.4 4.9-12.1S18.5 1.5 20.5 3.5Zm0 17c-2 2-7.4-.2-12.1-4.9S1.5 5.5 3.5 3.5s7.4.2 12.1 4.9 6.9 10.1 4.9 12.1Z'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	{...rest}><path d={paths[name] ?? paths.atom} /></svg
>

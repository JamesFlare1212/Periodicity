<script lang="ts">
	import {
		elements,
		formatTrendValue,
		getTrendValue,
		trendDefinitions,
		type Element,
		type TrendId
	} from '#lib/data/elements.js';

	interface Props {
		trend?: TrendId;
		active?: number | null;
		items?: Element[];
		compact?: boolean;
	}

	let {
		trend = 'ionizationEnergy',
		active = null,
		items = elements,
		compact = false
	}: Props = $props();
	let clientWidth = $state(0);
	let selectedNumber = $state<number | null>(null);
	let definition = $derived(trendDefinitions.find((item) => item.id === trend)!);
	let width = $derived(Math.max(290, clientWidth || 840));
	let height = $derived(compact ? 248 : 330);
	let left = $derived(width < 450 ? 47 : 60);
	const right = 15;
	const top = 18;
	const bottom = 38;
	let firstNumber = $derived(items[0]?.number ?? 1);
	let lastNumber = $derived(items.at(-1)?.number ?? 118);
	let selectedElement = $derived(
		items.find((item) => item.number === (selectedNumber ?? active)) ?? items[0] ?? elements[0]
	);
	let selectedValue = $derived(getTrendValue(selectedElement, trend));
	let values = $derived(
		items
			.map((element) => getTrendValue(element, trend))
			.filter((value): value is number => value !== null)
	);
	let minimum = $derived(Math.min(0, ...values));
	let maximum = $derived(Math.max(0, ...values) > minimum ? Math.max(0, ...values) : minimum + 1);
	let range = $derived(maximum - minimum);
	let ticks = $derived(Array.from({ length: 5 }, (_, index) => minimum + (range * index) / 4));
	let xTicks = $derived.by(() => {
		const count = width < 500 ? 4 : 6;
		return [
			...new Set(
				Array.from({ length: count }, (_, index) =>
					Math.round(firstNumber + ((lastNumber - firstNumber) * index) / (count - 1))
				)
			)
		];
	});
	let path = $derived.by(() => {
		let result = '';
		let previousNumber: number | null = null;
		for (const element of items) {
			const value = getTrendValue(element, trend);
			if (value === null) {
				previousNumber = null;
				continue;
			}
			result += `${previousNumber === element.number - 1 ? 'L' : 'M'}${x(element.number).toFixed(2)},${y(value).toFixed(2)} `;
			previousNumber = element.number;
		}
		return result;
	});

	$effect(() => {
		active;
		trend;
		selectedNumber = null;
	});

	function x(number: number) {
		return (
			left +
			((number - firstNumber) / Math.max(1, lastNumber - firstNumber)) * (width - left - right)
		);
	}

	function y(value: number) {
		return top + (1 - (value - minimum) / range) * (height - top - bottom);
	}

	function tickLabel(value: number) {
		if (value === 0) return '0';
		const magnitude = Math.max(Math.abs(minimum), Math.abs(maximum));
		return new Intl.NumberFormat('en', {
			maximumFractionDigits: magnitude < 0.01 ? 1 : magnitude < 10 ? 2 : 0,
			notation:
				magnitude > 0 && magnitude < 0.01
					? 'scientific'
					: magnitude >= 10000
						? 'compact'
						: 'standard'
		}).format(value);
	}

	function select(number: number) {
		selectedNumber = number;
	}

	function selectFromPointer(event: PointerEvent | MouseEvent) {
		const target = event.currentTarget as SVGRectElement;
		const svg = target.ownerSVGElement;
		if (!svg) return;
		const bounds = svg.getBoundingClientRect();
		const pointerX = ((event.clientX - bounds.left) / bounds.width) * width;
		const atomicNumber =
			firstNumber + ((pointerX - left) / (width - left - right)) * (lastNumber - firstNumber);
		const nearest = items.reduce(
			(best, element) =>
				Math.abs(element.number - atomicNumber) < Math.abs(best.number - atomicNumber)
					? element
					: best,
			items[0]
		);
		if (nearest) select(nearest.number);
	}

	function handlePointer(event: PointerEvent) {
		if (event.pointerType === 'mouse' || event.buttons === 1) selectFromPointer(event);
	}

	function handleKey(event: KeyboardEvent) {
		const index = items.findIndex((element) => element.number === selectedElement.number);
		let next = index;
		if (event.key === 'ArrowRight' || event.key === 'ArrowUp')
			next = Math.min(items.length - 1, index + 1);
		else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, index - 1);
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = items.length - 1;
		else return;
		event.preventDefault();
		if (items[next]) select(items[next].number);
	}
</script>

<div
	class="trend-chart"
	class:compact
	bind:clientWidth
	style={`--trend-color: ${definition.color}`}
>
	<div class="chart-readout" aria-live="polite" aria-atomic="true">
		<a class="readout-element" href={`/element/${selectedElement.number}/`}>
			<span class="readout-symbol">{selectedElement.symbol}</span>
			<span
				><strong>{selectedElement.name}</strong><small>Atomic number {selectedElement.number}</small
				></span
			>
		</a>
		<div class="readout-value">
			<strong>{formatTrendValue(selectedElement, trend)}</strong><small
				>{definition.unit || 'Pauling scale'}</small
			>
		</div>
	</div>

	<svg
		viewBox={`0 0 ${width} ${height}`}
		width="100%"
		{height}
		role="group"
		aria-label={`${definition.label} by atomic number`}
	>
		<title>{definition.label} by atomic number</title>
		<g aria-hidden="true">
			{#each ticks as tick}
				<line class="grid-line" x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} />
				<text class="axis-label" x={left - 10} y={y(tick) + 4} text-anchor="end"
					>{tickLabel(tick)}</text
				>
			{/each}
			{#each xTicks as tick}
				<text
					class="axis-label"
					x={x(tick)}
					y={height - 16}
					text-anchor={tick === firstNumber ? 'start' : tick === lastNumber ? 'end' : 'middle'}
					>{tick}</text
				>
			{/each}
			<path class="trend-path" d={path} />
			{#each items as element}
				{@const value = getTrendValue(element, trend)}
				{#if value !== null}
					<circle class="data-point" cx={x(element.number)} cy={y(value)} r={compact ? 2 : 2.6} />
				{/if}
			{/each}
			<line
				class="selection-line"
				x1={x(selectedElement.number)}
				x2={x(selectedElement.number)}
				y1={top}
				y2={height - bottom}
			/>
			{#if selectedValue !== null}
				<circle class="selected-halo" cx={x(selectedElement.number)} cy={y(selectedValue)} r="8" />
				<circle class="selected-point" cx={x(selectedElement.number)} cy={y(selectedValue)} r="4" />
			{/if}
		</g>
		<rect
			class="chart-interaction"
			x={left}
			y={top}
			width={width - left - right}
			height={height - top - bottom}
			fill="transparent"
			tabindex="0"
			role="slider"
			aria-label="Explore elements by atomic number"
			aria-valuemin={firstNumber}
			aria-valuemax={lastNumber}
			aria-valuenow={selectedElement.number}
			aria-valuetext={`${selectedElement.name}, atomic number ${selectedElement.number}: ${formatTrendValue(selectedElement, trend)} ${selectedValue === null ? '' : definition.unit}`}
			onpointermove={handlePointer}
			onclick={selectFromPointer}
			onkeydown={handleKey}
		/>
	</svg>

	<div class="chart-caption">
		<span>Atomic number</span><span>Gaps indicate unavailable data</span>
	</div>
	{#if !compact}
		<div class="chart-access">
			<label for={`chart-element-${trend}`}>Explore an element</label>
			<select
				id={`chart-element-${trend}`}
				value={selectedElement.number}
				onchange={(event) => select(Number(event.currentTarget.value))}
			>
				{#each items as element}<option value={element.number}
						>{element.number}. {element.name} ({element.symbol})</option
					>{/each}
			</select>
			<p>Use the arrow keys on the chart, or choose an element to see its exact value.</p>
		</div>
	{/if}
</div>

<style>
	.trend-chart {
		min-width: 0;
		width: 100%;
	}
	.chart-readout {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-height: 62px;
		margin-bottom: 12px;
	}
	.readout-element {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		text-decoration: none;
		color: var(--text);
		border-radius: 6px;
	}
	.readout-symbol {
		width: 43px;
		min-height: 45px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border: 1px solid var(--border);
		background: var(--surface-raised);
		border-radius: 6px;
		font-family: var(--font-display);
		font-size: 23px;
	}
	.readout-element strong {
		display: block;
		font-size: 15px;
		font-weight: 500;
	}
	.readout-element small,
	.readout-value small {
		display: block;
		font-size: 12px;
		color: var(--muted);
		line-height: 1.6;
	}
	.readout-value {
		text-align: right;
		flex-shrink: 0;
	}
	.readout-value strong {
		color: var(--trend-color);
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 24px;
		font-variant-numeric: tabular-nums;
	}
	svg {
		display: block;
		overflow: visible;
	}
	.grid-line {
		stroke: var(--border);
		stroke-width: 1;
		stroke-dasharray: 3 5;
	}
	.axis-label {
		fill: var(--muted);
		font-family: var(--font-body);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.trend-path {
		fill: none;
		stroke: var(--trend-color);
		stroke-width: 1.8;
		stroke-linejoin: round;
	}
	.data-point {
		fill: var(--trend-color);
	}
	.selection-line {
		stroke: var(--muted);
		stroke-width: 1;
		stroke-dasharray: 4 4;
	}
	.selected-halo {
		fill: var(--surface);
		stroke: var(--trend-color);
		stroke-width: 1.4;
	}
	.selected-point {
		fill: var(--trend-color);
	}
	.chart-interaction {
		cursor: crosshair;
		touch-action: pan-y;
	}
	.chart-caption {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		font-size: 12px;
		color: var(--muted);
		margin-top: 0;
	}
	.chart-caption span:last-child {
		text-align: right;
	}
	.chart-access {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 10px 16px;
		margin-top: 22px;
		padding-top: 18px;
		border-top: 1px solid var(--border);
	}
	label {
		font-size: 13px;
		color: var(--muted);
	}
	select {
		background: var(--surface-raised);
		border-radius: 7px;
		width: 100%;
		padding: 8px 12px;
		font-size: 14px;
	}
	.chart-access p {
		grid-column: 1 / -1;
		font-size: 12px;
		line-height: 1.6;
		margin: 0;
		color: var(--muted);
	}
	.compact .chart-readout {
		margin-bottom: 0;
	}
	.compact .readout-value strong {
		font-size: 21px;
	}
	.compact .readout-element strong {
		font-size: 14px;
	}
	@media (max-width: 480px) {
		.readout-element {
			gap: 9px;
		}
		.readout-value strong {
			font-size: 21px;
		}
		.readout-symbol {
			width: 37px;
			min-height: 42px;
			font-size: 21px;
		}
		.chart-access {
			grid-template-columns: 1fr;
			gap: 8px;
		}
		.chart-caption {
			font-size: 11px;
		}
	}
</style>

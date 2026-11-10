import { describe, expect, test } from 'bun:test';
import { compile } from 'svelte/compiler';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getElement } from '../data/elements.js';

// Compile the real component and renderer together: no DOM shim or duplicate Svelte runtime.
const directory = dirname(fileURLToPath(import.meta.url));
const bundle = await Bun.build({
	entrypoints: ['trend-chart-test'],
	target: 'bun',
	plugins: [
		{
			name: 'chart-ssr-test',
			setup(build) {
				build.onResolve({ filter: /^trend-chart-test$/ }, () => ({
					path: 'entry',
					namespace: 'chart-test'
				}));
				build.onLoad({ filter: /.*/, namespace: 'chart-test' }, () => ({
					contents: `export { default as Chart } from ${JSON.stringify(join(directory, 'TrendChart.svelte'))}; export { render } from 'svelte/server';`,
					loader: 'js',
					resolveDir: directory
				}));
				build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => ({
					contents: compile(await Bun.file(path).text(), { filename: path, generate: 'server' }).js
						.code,
					loader: 'js'
				}));
			}
		}
	]
});
if (!bundle.success) throw new AggregateError(bundle.logs, 'Chart test compilation failed');
const { Chart, render } = await import(
	`data:text/javascript;base64,${Buffer.from(await bundle.outputs[0].text()).toString('base64')}`
);

function chart(numbers: number[], extra = {}) {
	return render(Chart, { props: { items: numbers.map((number) => getElement(number)!), ...extra } })
		.body as string;
}

describe('chart input invariants', () => {
	test('empty input has no invented element, selected point, or interactive slider', () => {
		const html = chart([]);
		expect(html).toContain('No elements to display.');
		expect(html).not.toContain('/element/1/');
		expect(html).not.toContain('role="slider"');
		expect(html).not.toContain('class="selected-point');
	});

	test('ranked search input is ordered by atomic number without mutating the input', () => {
		const items = [20, 6, 48, 55, 98].map((number) => getElement(number)!);
		const html = render(Chart, { props: { items, active: 6 } }).body as string;
		expect(items.map((element) => element.number)).toEqual([20, 6, 48, 55, 98]);
		expect(html).toContain('aria-valuemin="6"');
		expect(html).toContain('aria-valuemax="98"');
		const xs = [...html.matchAll(/<circle[^>]*\bcx="([^"]+)"/g)].map((match) => Number(match[1]));
		expect(xs.length).toBeGreaterThan(0);
		for (const x of xs) {
			expect(x).toBeGreaterThanOrEqual(60);
			expect(x).toBeLessThanOrEqual(825);
		}
	});

	test('an all-missing measurement set does not invent zero-valued points', () => {
		const html = chart([2], { trend: 'electronegativity' });
		expect(html).toContain('Unknown');
		expect(html).toContain('aria-valuenow="2"');
		expect(html).not.toContain('class="data-point');
		expect(html).not.toContain('class="selected-point');
		expect(html).not.toMatch(/(?:NaN|Infinity)/);
	});

	test('a measured zero stays a plotted value and a missing measurement breaks the line', () => {
		const zero = chart([1, 2], { trend: 'electronAffinity', active: 2 });
		expect(zero).toContain('class="selected-point');
		expect(zero).not.toContain('Unknown');
		const gap = chart([1, 2, 3], { trend: 'electronegativity' });
		const path = gap.match(/class="trend-path[^>]*\bd="([^"]*)"/)?.[1];
		expect(path).toBeDefined();
		expect(path!.match(/M/g)).toHaveLength(2);
		expect(path).not.toContain('L');
	});

	test('a single element and an active element outside the input keep finite coordinates', () => {
		const html = chart([26], { active: 1 });
		expect(html).toContain('aria-valuenow="26"');
		expect(html).not.toMatch(/(?:NaN|Infinity)/);
	});
});

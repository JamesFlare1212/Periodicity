import { afterEach, describe, expect, test } from 'bun:test';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ViteDevServer } from 'vite';
import { appTemplatePlugin, generateAppTemplate } from './app-template.js';

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'periodicity-template-'));
	roots.push(root);
	await mkdir(join(root, 'src/lib'), { recursive: true });
	await writeFile(join(root, 'src/app.html'), '<head><!-- periodicity:bootstrap --></head>');
	await writeFile(join(root, 'src/lib/bootstrap.ts'), 'globalThis.fixtureReady = true;');
	return root;
}

describe('generated application template lifecycle', () => {
	test('an unchanged template is not rewritten', async () => {
		const root = await fixture();
		const output = await generateAppTemplate(root);
		const before = await readFile(output, 'utf8');
		expect(before).toContain('<script>');
		expect(before).not.toContain('<!-- periodicity:bootstrap -->');
		await utimes(output, new Date('2020-01-01'), new Date('2020-01-01'));
		const timestamp = (await stat(output)).mtimeMs;
		await generateAppTemplate(root);
		expect((await stat(output)).mtimeMs).toBe(timestamp);
		expect(await readFile(output, 'utf8')).toBe(before);
	});

	test('aborting an in-flight render preserves the previously published template', async () => {
		const root = await fixture();
		const output = await generateAppTemplate(root);
		const previous = await readFile(output, 'utf8');
		await writeFile(join(root, 'src/lib/bootstrap.ts'), 'globalThis.fixtureReady = false;');
		const controller = new AbortController();
		const pending = generateAppTemplate(root, controller.signal);
		controller.abort();
		await expect(pending).rejects.toThrow();
		expect(await readFile(output, 'utf8')).toBe(previous);
		expect(await readdir(join(root, '.svelte-kit/generated'))).toEqual(['app.html']);
	});

	test('closing during a refresh aborts it and drops queued work without reloading', async () => {
		const root = await fixture();
		const watcher = Object.assign(new EventEmitter(), { add: (_paths: string[]) => {} });
		const httpServer = new EventEmitter();
		const reloads: unknown[] = [];
		const errors: string[] = [];
		const server = {
			watcher,
			httpServer,
			ws: { send: (event: unknown) => reloads.push(event) },
			config: { logger: { error: (message: string) => errors.push(message) } }
		};
		let calls = 0;
		let start!: () => void;
		let release!: () => void;
		const started = new Promise<void>((resolve) => {
			start = resolve;
		});
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		let signal: AbortSignal | undefined;
		const configure = appTemplatePlugin(root, async (_root, pendingSignal) => {
			calls++;
			signal = pendingSignal;
			start();
			await held;
			pendingSignal?.throwIfAborted();
			return 'unused';
		}).configureServer;
		if (typeof configure !== 'function') throw new Error('Expected a server setup hook');
		await configure.call({} as never, server as unknown as ViteDevServer);
		watcher.emit('change', join(root, 'src/app.html'));
		await started;
		watcher.emit('change', join(root, 'src/lib/bootstrap.ts'));
		httpServer.emit('close');
		expect(signal?.aborted).toBe(true);
		release();
		// All queued operations use resolved mock Promises: an event-loop barrier,
		// not a timing-dependent sleep, drains their microtask chain.
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(calls).toBe(1);
		expect(reloads).toEqual([]);
		expect(errors).toEqual([]);
		expect(watcher.listenerCount('change')).toBe(0);
	});

	test('a failed refresh does not poison the queue, and server shutdown removes its listener', async () => {
		const root = await fixture();
		const watcher = Object.assign(new EventEmitter(), { add: (_paths: string[]) => {} });
		const httpServer = new EventEmitter();
		const outcomes = new EventEmitter();
		const server = {
			watcher,
			httpServer,
			ws: { send: (event: unknown) => outcomes.emit('result', event) },
			config: { logger: { error: (message: string) => outcomes.emit('result', message) } }
		};
		const configure = appTemplatePlugin(root).configureServer;
		if (typeof configure !== 'function') throw new Error('Expected a server setup hook');
		await configure.call({} as never, server as unknown as ViteDevServer);
		await writeFile(join(root, 'src/app.html'), '<head>missing marker</head>');
		const failed = once(outcomes, 'result');
		watcher.emit('change', join(root, 'src/app.html'));
		expect((await failed)[0]).toContain('bootstrap marker is missing');
		await writeFile(join(root, 'src/app.html'), '<head><!-- periodicity:bootstrap --></head>');
		const recovered = once(outcomes, 'result');
		watcher.emit('change', join(root, 'src/lib/bootstrap.ts'));
		expect((await recovered)[0]).toEqual({ type: 'full-reload' });
		expect(await readFile(join(root, '.svelte-kit/generated/app.html'), 'utf8')).toContain(
			'fixtureReady'
		);
		expect(watcher.listenerCount('change')).toBe(1);
		httpServer.emit('close');
		expect(watcher.listenerCount('change')).toBe(0);
	});
});

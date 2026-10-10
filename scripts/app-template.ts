import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

const marker = '<!-- periodicity:bootstrap -->';
const templatePath = '.svelte-kit/generated/app.html';
const inputs = [
	'src/app.html',
	'src/lib/bootstrap.ts',
	'src/lib/view-state.ts',
	'src/lib/theme.ts',
	'src/lib/data/metadata.ts'
];

export async function renderAppTemplate(root = process.cwd()): Promise<string> {
	const template = await readFile(join(root, 'src/app.html'), 'utf8');
	if (!template.includes(marker)) throw new Error('The application bootstrap marker is missing.');
	const result = await Bun.build({
		entrypoints: [join(root, 'src/lib/bootstrap.ts')],
		target: 'browser',
		format: 'iife',
		minify: true
	});
	if (!result.success)
		throw new AggregateError(result.logs, 'The application bootstrap build failed.');
	const bootstrap = (await result.outputs[0].text()).replaceAll('</script', '<\\/script');
	return template.replace(marker, `<script>${bootstrap}</script>`);
}

export async function generateAppTemplate(root = process.cwd()): Promise<string> {
	const output = join(root, templatePath);
	const template = await renderAppTemplate(root);
	let previous: string | undefined;
	try {
		previous = await readFile(output, 'utf8');
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}
	if (previous !== template) {
		await mkdir(dirname(output), { recursive: true });
		await writeFile(output, template);
	}
	return output;
}

/** Rebuild inline startup code when its source changes during development. */
export function appTemplatePlugin(root = process.cwd()): Plugin {
	return {
		name: 'periodicity-app-template',
		configureServer(server) {
			const watched = inputs.map((input) => resolve(root, input));
			server.watcher.add(watched);
			let update = Promise.resolve();
			const refresh = (file: string) => {
				if (!watched.includes(resolve(file))) return;
				update = update
					.then(async () => {
						await generateAppTemplate(root);
						server.ws.send({ type: 'full-reload' });
					})
					.catch((error: unknown) => {
						server.config.logger.error(String(error));
					});
			};
			server.watcher.on('change', refresh);
			server.httpServer?.once('close', () => server.watcher.off('change', refresh));
		}
	};
}

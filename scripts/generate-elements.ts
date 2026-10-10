import { readFile, writeFile } from 'node:fs/promises';
import records from '../src/lib/data/element-records.json';
import { serializeElements } from '../src/lib/data/normalize-elements.js';

const output = new URL('../src/lib/data/elements.generated.json', import.meta.url);
const generated = serializeElements(records);

if (process.argv.includes('--check')) {
	const current = await readFile(output, 'utf8').catch(() => null);
	if (current !== generated) {
		console.error('Element data is stale. Run bun scripts/generate-elements.ts to regenerate it.');
		process.exitCode = 1;
	} else {
		console.log('Generated element data is current.');
	}
} else {
	await writeFile(output, generated);
	console.log(`Generated element data (${records.length} elements).`);
}

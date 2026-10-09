import { getElement, type Element } from '#lib/data/elements.js';

export type ConfigurationView = 'short' | 'full' | 'shell';
export interface Orbital {
	n: number;
	subshell: 's' | 'p' | 'd' | 'f';
	electrons: number;
	core: boolean;
}
export interface ElectronShell {
	n: number;
	electrons: number;
	orbitals: Orbital[];
}
export type ConfigurationResult =
	| {
			status: 'available';
			short: string;
			full: string;
			orbitals: Orbital[];
			shells: ElectronShell[];
			totalElectrons: number;
			coreSymbol: string | null;
			coreElectrons: number;
			shellsMatch: boolean;
	  }
	| { status: 'unavailable'; short: string; reason: string };

type CoreResolver = (symbol: string) => string | undefined;
const coreElectrons: Record<string, number> = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 };
const capacities = { s: 2, p: 6, d: 10, f: 14 };
const resolveReferenceCore: CoreResolver = (symbol) => getElement(symbol)?.electronConfiguration;

export function normalizeConfigurationView(value: string | null): ConfigurationView {
	return value === 'short' || value === 'shell' ? value : 'full';
}

export function orbitalNotation(orbital: Orbital): string {
	return `${orbital.n}${orbital.subshell}${orbital.electrons}`;
}

/** Compare occupancies by orbital identity, treating absent orbitals as empty. */
export function getDifferingOrbitals(results: ConfigurationResult[]): Set<string> {
	const occupancies = results
		.filter((result) => result.status === 'available')
		.map(
			(result) =>
				new Map(
					result.orbitals.map((orbital) => [`${orbital.n}${orbital.subshell}`, orbital.electrons])
				)
		);
	const differences = new Set<string>();
	if (occupancies.length < 2) return differences;
	for (const key of new Set(occupancies.flatMap((occupancy) => [...occupancy.keys()]))) {
		const first = occupancies[0].get(key) ?? 0;
		if (occupancies.some((occupancy) => (occupancy.get(key) ?? 0) !== first)) differences.add(key);
	}
	return differences;
}

/** Expand recorded cores, without assigning new occupancies or reordering the source. */
export function expandElectronConfiguration(
	configuration: string,
	resolveCore: CoreResolver = resolveReferenceCore,
	seen = new Set<string>()
): Orbital[] {
	if (!configuration.trim()) throw new Error('No electron configuration is recorded.');
	const tokens = configuration.trim().split(/\s+/);
	const core = tokens[0].match(/^\[([A-Z][a-z]?)\]$/);
	let orbitals: Orbital[] = [];
	if (core) {
		const symbol = core[1];
		if (!Object.hasOwn(coreElectrons, symbol) || seen.has(symbol))
			throw new Error('The reference core could not be expanded.');
		const reference = resolveCore(symbol);
		if (!reference) throw new Error('The reference core is not available.');
		orbitals = expandElectronConfiguration(reference, resolveCore, new Set([...seen, symbol])).map(
			(orbital) => ({ ...orbital, core: true })
		);
		if (orbitals.reduce((sum, orbital) => sum + orbital.electrons, 0) !== coreElectrons[symbol])
			throw new Error('The reference core electron count needs review.');
		tokens.shift();
	}
	for (const token of tokens) {
		const match = token.match(/^([1-7])([spdf])([1-9]\d*)$/);
		if (!match) throw new Error('The reference configuration contains unrecognized notation.');
		const n = Number(match[1]);
		const subshell = match[2] as Orbital['subshell'];
		const electrons = Number(match[3]);
		if ('spdf'.indexOf(subshell) >= n || electrons > capacities[subshell])
			throw new Error('The reference configuration contains an invalid occupancy.');
		orbitals.push({ n, subshell, electrons, core: false });
	}
	if (
		new Set(orbitals.map((orbital) => `${orbital.n}${orbital.subshell}`)).size !== orbitals.length
	)
		throw new Error('The reference configuration repeats an orbital.');
	return orbitals;
}

export function getElectronConfiguration(
	element: Pick<Element, 'number' | 'electronConfiguration' | 'shells'>,
	resolveCore: CoreResolver = resolveReferenceCore
): ConfigurationResult {
	const short = element.electronConfiguration.trim();
	try {
		const orbitals = expandElectronConfiguration(short, resolveCore);
		const totalElectrons = orbitals.reduce((sum, orbital) => sum + orbital.electrons, 0);
		if (totalElectrons !== element.number)
			throw new Error('The configuration electron count does not match this element.');
		const shells: ElectronShell[] = [...new Set(orbitals.map((orbital) => orbital.n))]
			.sort((a, b) => a - b)
			.map((n) => {
				const shellOrbitals = orbitals.filter((orbital) => orbital.n === n);
				return {
					n,
					electrons: shellOrbitals.reduce((sum, orbital) => sum + orbital.electrons, 0),
					orbitals: shellOrbitals
				};
			});
		return {
			status: 'available',
			short,
			full: orbitals.map(orbitalNotation).join(' '),
			orbitals,
			shells,
			totalElectrons,
			coreSymbol: short.match(/^\[([^\]]+)\]/)?.[1] ?? null,
			coreElectrons: orbitals
				.filter((orbital) => orbital.core)
				.reduce((sum, o) => sum + o.electrons, 0),
			shellsMatch:
				shells.length === element.shells.length &&
				shells.every(
					(shell, index) => shell.n === index + 1 && shell.electrons === element.shells[index]
				)
		};
	} catch (error) {
		return {
			status: 'unavailable',
			short,
			reason: error instanceof Error ? error.message : 'Full configuration is not available.'
		};
	}
}

export function configurationText(result: ConfigurationResult, view: ConfigurationView): string {
	if (result.status === 'unavailable' || view === 'short') return result.short;
	if (view === 'full') return result.full;
	return result.shells
		.map(
			(shell) =>
				`n=${shell.n}: ${shell.orbitals.map(orbitalNotation).join(' ')} (${shell.electrons} electrons)`
		)
		.join('\n');
}

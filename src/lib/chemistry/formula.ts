import { elements } from '../data/elements';

export interface FormulaElement {
	symbol: string;
	name: string;
	number: number;
	atomicMass: number;
	category: string;
}

export interface CompositionEntry {
	element: FormulaElement;
	count: number;
	mass: number;
	percentage: number;
}

export interface MolarMassResult {
	formula: string;
	totalMass: number;
	totalAtoms: number;
	composition: CompositionEntry[];
}

export class FormulaError extends Error {
	constructor(
		message: string,
		public readonly position: number = 0
	) {
		super(message);
		this.name = 'FormulaError';
	}
}

const subscriptDigits = '₀₁₂₃₄₅₆₇₈₉';

/** Normalize pasted chemical subscripts without changing case-sensitive symbols. */
export function normalizeFormula(formula: string): string {
	return formula.trim().replace(/[₀-₉]/g, (digit) => String(subscriptDigits.indexOf(digit)));
}

/** Parse neutral formulas, nested groups, and dot-separated hydrates. */
export function parseFormula(
	input: string,
	dataset: readonly FormulaElement[] = elements
): Map<string, number> {
	const formula = normalizeFormula(input);
	if (!formula) throw new FormulaError('Enter a chemical formula, such as H2O.');
	if (formula.length > 4096)
		throw new FormulaError('This formula is too long. Use at most 4,096 characters.');

	const symbols = new Set(dataset.map((element) => element.symbol));
	let position = 0;

	function skipWhitespace() {
		while (/\s/.test(formula[position] ?? '') && position < formula.length) position++;
	}

	function positiveInteger(): number {
		skipWhitespace();
		const start = position;
		while (/[0-9]/.test(formula[position] ?? '') && position < formula.length) position++;
		if (start === position) return 1;
		const digits = formula.slice(start, position);
		const count = Number(digits);
		if (!Number.isSafeInteger(count) || count < 1) {
			throw new FormulaError(
				'Atom counts must be positive whole numbers within the safe numeric range.',
				start
			);
		}
		if (digits.length > 1 && digits.startsWith('0')) {
			throw new FormulaError('Remove the leading zero from this atom count.', start);
		}
		return count;
	}

	function add(target: Map<string, number>, source: Map<string, number>, multiplier = 1) {
		for (const [symbol, count] of source) {
			const total = (target.get(symbol) ?? 0) + count * multiplier;
			if (!Number.isSafeInteger(total)) {
				throw new FormulaError(
					'The atom count is too large. Use smaller group multipliers.',
					position
				);
			}
			target.set(symbol, total);
		}
	}

	function group(expectedClose?: string, depth = 0): Map<string, number> {
		if (depth > 32) throw new FormulaError('Use fewer than 33 levels of nested groups.', position);
		const atoms = new Map<string, number>();
		while (position < formula.length) {
			skipWhitespace();
			const character = formula[position];
			if (character === undefined) break;

			if (character === ')' || character === ']') {
				if (character !== expectedClose) {
					throw new FormulaError(
						expectedClose
							? `Close this group with ${expectedClose}, rather than ${character}.`
							: `Remove the unmatched ${character}.`,
						position
					);
				}
				if (atoms.size === 0)
					throw new FormulaError('An empty group needs at least one element.', position);
				position++;
				return atoms;
			}

			if (character === '·') {
				if (expectedClose)
					throw new FormulaError(
						'Put hydrate separators outside parentheses or brackets.',
						position
					);
				break;
			}

			if (character === '(' || character === '[') {
				position++;
				const inner = group(character === '(' ? ')' : ']', depth + 1);
				add(atoms, inner, positiveInteger());
				continue;
			}

			if (/[A-Z]/.test(character)) {
				const start = position++;
				while (/[a-z]/.test(formula[position] ?? '') && position < formula.length) position++;
				const symbol = formula.slice(start, position);
				if (!symbols.has(symbol)) {
					throw new FormulaError(
						`“${symbol}” is not an element symbol. Check its spelling and capitalization.`,
						start
					);
				}
				add(atoms, new Map([[symbol, positiveInteger()]]));
				continue;
			}

			if (/[a-z]/.test(character)) {
				throw new FormulaError(
					'Element symbols start with a capital letter. Try H2O instead of h2o.',
					position
				);
			}
			if (/[0-9]/.test(character)) {
				throw new FormulaError(
					'Place an atom count after its element or group, such as H2 or (OH)2.',
					position
				);
			}
			if (character === '.') {
				throw new FormulaError(
					'Atom counts must be whole numbers. Use the middle dot · to separate a hydrate, such as CuSO4·5H2O.',
					position
				);
			}
			throw new FormulaError(
				`Remove “${character}”. Use element symbols, whole-number counts, parentheses, or hydrate dots.`,
				position
			);
		}
		if (expectedClose)
			throw new FormulaError(`This group is missing its closing ${expectedClose}.`, position);
		return atoms;
	}

	const result = new Map<string, number>();
	while (position < formula.length) {
		skipWhitespace();
		const start = position;
		const coefficient = positiveInteger();
		const part = group();
		if (part.size === 0)
			throw new FormulaError('Add an element before or after the hydrate separator.', start);
		add(result, part, coefficient);
		if (position < formula.length) {
			position++;
			skipWhitespace();
			if (position === formula.length)
				throw new FormulaError(
					'Add the hydrate formula after the dot, such as ·5H2O.',
					position - 1
				);
		}
	}
	return result;
}

export function calculateMolarMass(
	input: string,
	dataset: readonly FormulaElement[] = elements
): MolarMassResult {
	const atoms = parseFormula(input, dataset);
	const bySymbol = new Map(dataset.map((element) => [element.symbol, element]));
	const composition: CompositionEntry[] = [];
	let totalMass = 0;
	let totalAtoms = 0;
	for (const [symbol, count] of atoms) {
		const element = bySymbol.get(symbol)!;
		if (!Number.isFinite(element.atomicMass) || element.atomicMass <= 0) {
			throw new FormulaError(
				`No atomic mass is available for ${element.name}. Choose a different element.`
			);
		}
		const mass = element.atomicMass * count;
		totalMass += mass;
		totalAtoms += count;
		composition.push({ element, count, mass, percentage: 0 });
	}
	if (!Number.isFinite(totalMass) || !Number.isSafeInteger(totalAtoms)) {
		throw new FormulaError(
			'The formula is too large to calculate reliably. Use smaller atom counts.'
		);
	}
	for (const component of composition) component.percentage = (component.mass / totalMass) * 100;
	return {
		formula: normalizeFormula(input).replace(/\s+/g, ''),
		totalMass,
		totalAtoms,
		composition
	};
}

/** Text fragments keep chemical subscripts semantic without injecting HTML. */
export function formulaFragments(input: string): { text: string; subscript: boolean }[] {
	const formula = normalizeFormula(input).replace(/\s+/g, '');
	const fragments: { text: string; subscript: boolean }[] = [];
	const pattern = /\d+|[^\d]+/g;
	for (const match of formula.matchAll(pattern)) {
		const index = match.index ?? 0;
		fragments.push({
			text: match[0],
			subscript: /\d/.test(match[0]) && /[a-zA-Z)\]]/.test(formula[index - 1] ?? '')
		});
	}
	return fragments;
}

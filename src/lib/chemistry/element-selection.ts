import { calculateMolarMass, type FormulaElement, type MolarMassResult } from './formula.js';

/** Combine repeated atoms while retaining the order in which elements were first added. */
export function calculateElementSelection(
	selection: readonly FormulaElement[]
): MolarMassResult | null {
	if (selection.length === 0) return null;
	const counts = new Map<string, number>();
	for (const element of selection) {
		counts.set(element.symbol, (counts.get(element.symbol) ?? 0) + 1);
	}
	const formula = Array.from(
		counts,
		([symbol, count]) => `${symbol}${count > 1 ? count : ''}`
	).join('');
	return calculateMolarMass(formula, selection);
}

/** A connected node with a layout box can still be inert, disabled, or invisible. */
export function isFocusAvailable(target: HTMLElement | null | undefined): boolean {
	if (
		!target?.isConnected ||
		!target.getClientRects().length ||
		target.matches(':disabled') ||
		target.closest('[inert], [hidden], [aria-hidden="true"]')
	)
		return false;
	const visibility = getComputedStyle(target).visibility;
	return visibility !== 'hidden' && visibility !== 'collapse';
}

export function restoreFocus(
	preferred: HTMLElement | null | undefined,
	fallback?: HTMLElement | null,
	options: FocusOptions = { preventScroll: true }
): void {
	for (const target of [preferred, fallback]) {
		if (!target || !isFocusAvailable(target)) continue;
		target.focus(options);
		if (document.activeElement === target) return;
	}
}

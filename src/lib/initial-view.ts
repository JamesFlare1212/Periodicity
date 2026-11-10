export const INITIAL_VIEW_TIMEOUT_MS = 15000;
export const INITIAL_VIEW_READY_EVENT = 'periodicity:ready';

/** Runs inline, before route modules: recovery must not depend on hydration. */
export function beginInitialView(): void {
	const root = document.documentElement;
	root.dataset.initialView = 'pending';
	let finished = false;
	function fail() {
		if (!finished) root.dataset.initialView = 'failed';
	}
	function onError(event: Event) {
		if (event.target === window || event.target instanceof HTMLScriptElement) fail();
	}
	function retry(event: Event) {
		if (
			root.dataset.initialView === 'failed' &&
			event.target instanceof HTMLElement &&
			event.target.closest('[data-retry-initial-view]')
		) {
			event.preventDefault();
			location.reload();
		}
	}
	const timeout = setTimeout(fail, INITIAL_VIEW_TIMEOUT_MS);
	function finish() {
		finished = true;
		clearTimeout(timeout);
		window.removeEventListener('error', onError, true);
		window.removeEventListener('unhandledrejection', fail);
		window.removeEventListener('click', retry);
		window.removeEventListener(INITIAL_VIEW_READY_EVENT, finish);
		root.removeAttribute('data-initial-view');
	}
	window.addEventListener('error', onError, true);
	window.addEventListener('unhandledrejection', fail);
	window.addEventListener('click', retry);
	window.addEventListener(INITIAL_VIEW_READY_EVENT, finish);
}

/** Event bridge between the inline bootstrap bundle and the hydrated app bundle. */
export function markAppReady(): void {
	window.dispatchEvent(new Event(INITIAL_VIEW_READY_EVENT));
	document.documentElement.removeAttribute('data-initial-view');
	document.documentElement.dataset.appReady = 'true';
}

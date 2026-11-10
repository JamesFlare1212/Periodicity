export const VIEW_LINK_FAILURE = 'The view changed, but its link could not be updated. Try again.';

interface Owner {
	revision: number;
	disposed: boolean;
	requests: Set<Attempt>;
}
interface Attempt {
	owner: Owner;
	revision: number;
	epoch: number;
	pathname: string;
	cancel: () => void;
}
export interface ViewLinkWriter {
	(url: URL): Promise<boolean>;
	invalidate(): void;
	dispose(): void;
}

let navigationEpoch = 0;
const attempts = new Map<string, Set<Attempt>>();

/** Full navigation/popstate hands ownership to a new view, even on the same route. */
export function invalidatePendingViewLinks(): void {
	navigationEpoch++;
	for (const pending of attempts.values()) for (const attempt of pending) attempt.cancel();
}

/** Called synchronously by the layout's beforeNavigate, before history is changed. */
export function canApplyViewLink(url: URL, current: URL): boolean {
	if (url.pathname !== current.pathname) return false;
	const pending = attempts.get(url.href);
	return (
		!pending ||
		[...pending].some(
			(attempt) =>
				!attempt.owner.disposed &&
				attempt.owner.revision === attempt.revision &&
				attempt.epoch === navigationEpoch &&
				attempt.pathname === current.pathname
		)
	);
}

/** Latest intent owns both the URL commit and feedback, not just the Promise result. */
export function createViewLinkWriter(
	navigate: (url: URL) => Promise<unknown>,
	notice: (message: string) => void,
	{
		currentUrl = () => new URL(location.href),
		failureMessage = VIEW_LINK_FAILURE
	}: { currentUrl?: () => URL; failureMessage?: string } = {}
): ViewLinkWriter {
	const owner: Owner = { revision: 0, disposed: false, requests: new Set() };
	const write: ViewLinkWriter = Object.assign(
		async (requestedUrl: URL) => {
			if (owner.disposed) return false;
			for (const request of owner.requests) request.cancel();
			let cancel!: () => void;
			const cancelled = new Promise<false>((resolve) => {
				cancel = () => resolve(false);
			});
			const url = new URL(requestedUrl.href);
			const attempt: Attempt = {
				owner,
				revision: ++owner.revision,
				epoch: navigationEpoch,
				pathname: currentUrl().pathname,
				cancel
			};
			owner.requests.add(attempt);
			const isCurrent = () =>
				!owner.disposed &&
				owner.revision === attempt.revision &&
				attempt.epoch === navigationEpoch &&
				currentUrl().pathname === attempt.pathname;
			const pending = attempts.get(url.href) ?? new Set<Attempt>();
			pending.add(attempt);
			attempts.set(url.href, pending);
			notice('');
			const complete = async () => {
				try {
					await navigate(url);
					if (!isCurrent()) return false;
					// goto can resolve after a beforeNavigate cancellation without applying the URL.
					if (currentUrl().href !== url.href) {
						notice(failureMessage);
						return false;
					}
					return true;
				} catch {
					if (isCurrent()) notice(failureMessage);
					return false;
				} finally {
					pending.delete(attempt);
					owner.requests.delete(attempt);
					if (pending.size === 0) attempts.delete(url.href);
				}
			};
			// Cancellation releases the UI immediately, but the guarded transport is
			// retained until settlement so a late beforeNavigate cannot commit it.
			return Promise.race([complete(), cancelled]);
		},
		{
			invalidate() {
				owner.revision++;
				for (const request of owner.requests) request.cancel();
				if (!owner.disposed) notice('');
			},
			dispose() {
				owner.disposed = true;
				owner.revision++;
				for (const request of owner.requests) request.cancel();
			}
		}
	);
	return write;
}

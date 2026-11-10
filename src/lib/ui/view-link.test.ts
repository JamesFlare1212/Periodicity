import { beforeEach, describe, expect, test } from 'bun:test';
import {
	canApplyViewLink,
	createViewLinkWriter,
	invalidatePendingViewLinks,
	VIEW_LINK_FAILURE
} from './view-link.js';

const url = (query = '') => new URL(`https://periodicity.example/${query}`);
beforeEach(invalidatePendingViewLinks);

function controller() {
	let current = url();
	let message = '';
	const requests: { target: URL; commit: () => void; fail: () => void }[] = [];
	const write = createViewLinkWriter(
		(target) =>
			new Promise<void>((resolve, reject) => {
				requests.push({
					target,
					commit() {
						// Same guard the layout runs before SvelteKit changes browser history.
						if (canApplyViewLink(target, current)) current = target;
						resolve();
					},
					fail: () => reject(new Error('History unavailable'))
				});
			}),
		(next) => {
			message = next;
		},
		{ currentUrl: () => current }
	);
	return {
		write,
		requests,
		get current() {
			return current;
		},
		set current(value: URL) {
			current = value;
		},
		get message() {
			return message;
		}
	};
}

describe('view-link ownership and acknowledgement', () => {
	test('reports failure without rejecting, then acknowledges a successful retry', async () => {
		const state = controller();
		const first = state.write(url('?display=phase'));
		state.requests[0].fail();
		expect(await first).toBe(false);
		expect(state.message).toBe(VIEW_LINK_FAILURE);
		const retry = state.write(url('?display=phase'));
		expect(state.message).toBe('');
		state.requests[1].commit();
		expect(await retry).toBe(true);
	});

	test('an old rejection cannot overwrite a successful newer interaction', async () => {
		const state = controller();
		const older = state.write(url('?element=1'));
		const newer = state.write(url('?element=2'));
		state.requests[1].commit();
		expect(await newer).toBe(true);
		state.requests[0].fail();
		expect(await older).toBe(false);
		expect(state.message).toBe('');
	});

	test('a late old commit cannot roll back the current URL', async () => {
		const state = controller();
		const older = state.write(url('?element=1'));
		const newer = state.write(url('?element=2'));
		state.requests[1].commit();
		await newer;
		state.requests[0].commit();
		expect(await older).toBe(false);
		expect(state.current.search).toBe('?element=2');
		expect(state.message).toBe('');
	});

	test('an old completion cannot clear a newer failure', async () => {
		const state = controller();
		const older = state.write(url('?element=1'));
		const newer = state.write(url('?element=2'));
		state.requests[1].fail();
		await newer;
		state.requests[0].commit();
		await older;
		expect(state.message).toBe(VIEW_LINK_FAILURE);
		expect(state.current.search).toBe('');
	});

	test('a resolved navigation without an applied URL is not acknowledged as success', async () => {
		let message = '';
		const write = createViewLinkWriter(
			async () => {},
			(next) => {
				message = next;
			},
			{ currentUrl: () => url() }
		);
		expect(await write(url('?element=1'))).toBe(false);
		expect(message).toBe(VIEW_LINK_FAILURE);
	});

	test('leaving the pathname prevents both a stale commit and stale failure feedback', async () => {
		const state = controller();
		const old = state.write(url('?element=1'));
		state.current = url('trends/');
		state.requests[0].commit();
		expect(await old).toBe(false);
		expect(state.current.pathname).toBe('/trends/');
		expect(state.message).toBe('');
	});

	test('external same-route navigation or popstate invalidates old intent', async () => {
		const state = controller();
		const old = state.write(url('?element=1'));
		invalidatePendingViewLinks();
		state.current = url('?element=8');
		state.requests[0].commit();
		expect(await old).toBe(false);
		expect(state.current.search).toBe('?element=8');
		expect(state.message).toBe('');
	});

	test('a disposed writer cannot commit, publish feedback, or start another request', async () => {
		const state = controller();
		const old = state.write(url('?element=1'));
		state.write.dispose();
		state.requests[0].fail();
		expect(await old).toBe(false);
		expect(await state.write(url('?element=2'))).toBe(false);
		expect(state.requests).toHaveLength(1);
		expect(state.message).toBe('');
	});

	test('editing a draft invalidates an earlier submitted formula before it commits', async () => {
		const state = controller();
		const submitted = state.write(url('?formula=NaCl'));
		state.write.invalidate();
		state.requests[0].commit();
		expect(await submitted).toBe(false);
		expect(state.current.search).toBe('');
		expect(state.message).toBe('');
	});

	test('invalidating navigation releases its acknowledgement before transport settles', async () => {
		const state = controller();
		const pending = state.write(url('?element=1'));
		invalidatePendingViewLinks();
		expect(await pending).toBe(false);
		state.current = url('?element=8');
		state.requests[0].commit();
		await Promise.resolve();
		expect(state.current.search).toBe('?element=8');
	});

	test('disposal releases a pending acknowledgement without waiting for its rejection', async () => {
		const state = controller();
		const pending = state.write(url('?element=1'));
		state.write.dispose();
		expect(await pending).toBe(false);
		state.requests[0].fail();
		await Promise.resolve();
		expect(state.message).toBe('');
	});

	test('A to B to A accepts the latest address, not an intervening B', async () => {
		const state = controller();
		const a1 = state.write(url('?element=1'));
		const b = state.write(url('?element=2'));
		const a2 = state.write(url('?element=1'));
		state.requests[0].commit();
		state.requests[1].commit();
		state.requests[2].commit();
		expect(await Promise.all([a1, b, a2])).toEqual([false, false, true]);
		expect(state.current.search).toBe('?element=1');
	});
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import type { Component } from 'svelte';
import { flushSync } from 'svelte';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import Harness from './unread-host.harness.svelte';

let calls: string[];
let conversations: number;
let failWith: number | null;

beforeEach(() => {
	calls = [];
	conversations = 2;
	failWith = null;
	vi.useFakeTimers({ shouldAdvanceTime: true });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => {
			calls.push(url);
			if (failWith) return new Response('{}', { status: failWith });
			return new Response(
				JSON.stringify({ status: 'success', message: '', data: { conversations } }),
				{ status: 200 }
			);
		})
	);
	page.url = new URL('https://edoctor.test/') as typeof page.url;
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

function draw(start: SessionStatus, onRetry?: () => void) {
	let setStatus: (next: SessionStatus) => void = () => undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: {
				start,
				onRetry,
				onReady: (found: typeof setStatus) => (setStatus = found)
			}
		}
	});
	return { setStatus: (next: SessionStatus) => setStatus(next) };
}

const MINUTE = 60_000;

describe('what the messages’ pages keep (R-10, R-11)', () => {
	it('🔴 U-65.6: it lives above the pages, and a sign-out on any page empties it', async () => {
		let session: Session | undefined;
		render(QueryHarness, {
			props: {
				component: Harness as unknown as Component<never>,
				props: { start: 'member', onSession: (found: Session) => (session = found) }
			}
		});
		screen.getByTestId('choose-chip').click();
		await waitFor(() => expect(screen.getByTestId('inbox-filter')).toHaveTextContent('patients'));
		await session?.signOut();
		await waitFor(() => expect(screen.getByTestId('inbox-filter')).toHaveTextContent('all'));
	});
});

describe('the unread badge (U-84 Π5, U-84.7)', () => {
	it('🔴 U-84: polling μόνο για συνδεδεμένο: a guest asks nothing, ever', async () => {
		draw('guest');
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		expect(calls).toEqual([]);
		expect(screen.getByTestId('badge')).toHaveTextContent('0:0');
	});

	it('🔴 U-84: nor while nobody knows yet who reads (the server’s page, the first read)', async () => {
		draw('unknown');
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		expect(calls).toEqual([]);
	});

	it('a member: one read now, then every 60 s elsewhere', async () => {
		draw('member');
		await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('2:2'));
		expect(calls).toHaveLength(1);
		expect(calls[0]).toContain('/messaging/unread-count');
		await vi.advanceTimersByTimeAsync(59_000);
		expect(calls).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(2_000);
		expect(calls).toHaveLength(2);
	});

	it('every 30 s on the pages of the messages', async () => {
		page.url = new URL('https://edoctor.test/en/messages') as typeof page.url;
		draw('member');
		await waitFor(() => expect(calls).toHaveLength(1));
		await vi.advanceTimersByTimeAsync(31_000);
		expect(calls).toHaveLength(2);
	});

	it('🔴 U-84.7: only while the page shows', async () => {
		draw('member');
		await waitFor(() => expect(calls).toHaveLength(1));
		const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
		await vi.advanceTimersByTimeAsync(5 * MINUTE);
		expect(calls).toHaveLength(1);
		hidden.mockRestore();
	});

	it('🔴 U-65.6: a sign-out stops the polling and empties the badge', async () => {
		const { setStatus } = draw('member');
		await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('2:2'));
		setStatus('guest');
		flushSync();
		await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('0:0'));
		const seen = calls.length;
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		expect(calls).toHaveLength(seen);
	});

	it('«9+» past nine', async () => {
		conversations = 12;
		draw('member');
		await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('12:9+'));
	});

	it('a session that ended (`401`): it stops asking and the page asks who it is', async () => {
		failWith = 401;
		const onRetry = vi.fn();
		draw('member', onRetry);
		await waitFor(() => expect(onRetry).toHaveBeenCalled());
		const seen = calls.length;
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		expect(calls).toHaveLength(seen);
	});

	it('(negative) a role the messages refuse (`403`): no error, no more asking, no badge', async () => {
		failWith = 403;
		draw('member');
		await waitFor(() => expect(calls).toHaveLength(1));
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		expect(calls).toHaveLength(1);
		expect(screen.getByTestId('badge')).toHaveTextContent('0:0');
	});

	it('a passing failure asks again on the next turn', async () => {
		failWith = 500;
		draw('member');
		await waitFor(() => expect(calls.length).toBeGreaterThan(0));
		const seen = calls.length;
		failWith = null;
		await vi.advanceTimersByTimeAsync(61_000);
		expect(calls.length).toBeGreaterThan(seen);
	});
});

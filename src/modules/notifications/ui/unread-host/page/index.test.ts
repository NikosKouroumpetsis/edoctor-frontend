import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import type { Component } from 'svelte';
import { focusManager, type QueryClient } from '@tanstack/svelte-query';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import { keepUnreadNotificationCount } from '$modules/notifications/api/inbox';
import Harness from './unread-host.harness.svelte';

/*
 * Wave 4.5 · screen 63 (D-W45-17, D-W45-49; record §5.1, §5.8): the ONE read behind every dot of «a notification is
 * new» — for a member only, on no timer, asked again when the page comes back to the front — and the «Προφίλ»'s bell
 * that draws it. The server is stubbed.
 */

type Call = { url: string; method: string; credentials?: RequestCredentials };
let calls: Call[];
let unread: number;
let failWith: number | null;

beforeEach(() => {
	calls = [];
	unread = 2;
	failWith = null;
	vi.useFakeTimers({ shouldAdvanceTime: true });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			calls.push({ url, method: init.method ?? 'GET', credentials: init.credentials });
			if (failWith) {
				return new Response(JSON.stringify({ errorCode: `EC${failWith}` }), { status: failWith });
			}
			return new Response(
				JSON.stringify({ status: 'success', message: '', data: { unreadCount: unread } }),
				{ status: 200 }
			);
		})
	);
});

afterEach(() => {
	focusManager.setFocused(undefined);
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

type Handle = { session: Session; client: QueryClient; answer: (next: SessionStatus) => void };

function draw(start: SessionStatus, onRetry?: () => void) {
	let handle: Handle | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { start, onRetry, onReady: (found: Handle) => (handle = found) }
		}
	});
	return () => handle as Handle;
}

/** The page went to the back and came to the front again. */
function foreground() {
	focusManager.setFocused(false);
	focusManager.setFocused(true);
}

const MINUTE = 60_000;
const badge = () => screen.getByTestId('badge');
const bell = () => screen.getByTestId('profile-bell');

describe('🔴 D-W45-17 · D-W45-49 · the one read of «a notification is new»', () => {
	it('🔴 a guest asks the server NOTHING — at the start, after ten minutes, when the page comes back to the front', async () => {
		draw('guest');
		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		foreground();
		await vi.advanceTimersByTimeAsync(MINUTE);
		expect(calls).toEqual([]);
		expect(badge()).toHaveTextContent('0:false');
	});

	it('🔴 nor while nobody knows yet who reads (the server’s page, the first read of the session)', async () => {
		draw('unknown');
		foreground();
		await vi.advanceTimersByTimeAsync(5 * MINUTE);
		expect(calls).toEqual([]);
		expect(badge()).toHaveTextContent('0:false');
	});

	it('a member: ONE `GET /notification/inbox/me/unread-count` with the cookies, and the count is the site’s', async () => {
		draw('member');
		await waitFor(() => expect(badge()).toHaveTextContent('2:true'));
		expect(calls).toHaveLength(1);
		expect(calls[0].url).toMatch(/\/notification\/inbox\/me\/unread-count$/u);
		expect(calls[0]).toMatchObject({ method: 'GET', credentials: 'include' });
	});

	it('🔴 rule 9: όχι polling με χρονόμετρο — an hour on the page asks nothing more', async () => {
		draw('member');
		await waitFor(() => expect(badge()).toHaveTextContent('2:true'));
		unread = 9;
		await vi.advanceTimersByTimeAsync(60 * MINUTE);
		expect(calls).toHaveLength(1);
		expect(badge()).toHaveTextContent('2:true');
	});

	it('🔴 rule 9: asked again whenever the page comes back to the front — at once, however fresh the last answer', async () => {
		draw('member');
		await waitFor(() => expect(badge()).toHaveTextContent('2:true'));
		unread = 0;
		foreground();
		await waitFor(() => expect(badge()).toHaveTextContent('0:false'));
		expect(calls).toHaveLength(2);
		unread = 4;
		foreground();
		await waitFor(() => expect(badge()).toHaveTextContent('4:true'));
		expect(calls).toHaveLength(3);
	});

	it('🔴 ONE place in the cache: what a page of the list or a «read» answers shows on every dot at once, with no request', async () => {
		const handle = draw('member');
		await waitFor(() => expect(badge()).toHaveTextContent('2:true'));
		keepUnreadNotificationCount(handle().client, 1);
		await waitFor(() => expect(badge()).toHaveTextContent('1:true'));
		keepUnreadNotificationCount(handle().client, 0);
		await waitFor(() => expect(badge()).toHaveTextContent('0:false'));
		expect(calls).toHaveLength(1);
	});

	it('🔴 U-65.6: a sign-out — no dot at once, nothing of the count kept, nothing asked any more; the next member reads afresh', async () => {
		const handle = draw('member');
		await waitFor(() => expect(badge()).toHaveTextContent('2:true'));
		await handle().session.signOut();
		await waitFor(() => expect(badge()).toHaveTextContent('0:false'));
		expect(
			handle()
				.client.getQueriesData({ queryKey: ['notifications'] })
				.every(([, data]) => data === undefined)
		).toBe(true);
		foreground();
		await vi.advanceTimersByTimeAsync(MINUTE);
		expect(calls).toHaveLength(1);
		unread = 7;
		handle().answer('member');
		await waitFor(() => expect(badge()).toHaveTextContent('7:true'));
		expect(calls).toHaveLength(2);
	});

	it('🔴 U-84: a `401` is a session that ended — the page asks who it is; no dot meanwhile, and no storm of requests', async () => {
		failWith = 401;
		const retried = vi.fn();
		draw('member', retried);
		await waitFor(() => expect(retried).toHaveBeenCalledTimes(1));
		expect(badge()).toHaveTextContent('0:false');
		await vi.advanceTimersByTimeAsync(5 * MINUTE);
		expect(calls).toHaveLength(1);
	});

	it('(negative) a failure that is no refusal shows no dot and asks the session nothing', async () => {
		failWith = 500;
		const retried = vi.fn();
		draw('member', retried);
		await vi.advanceTimersByTimeAsync(MINUTE);
		expect(badge()).toHaveTextContent('0:false');
		expect(retried).not.toHaveBeenCalled();
	});
});

describe('🔴 record §5.1 · the bell of the «Προφίλ»', () => {
	it('with nothing new: a link to the list named «Ειδοποιήσεις» — the round 44 inside its 48 target, no dot; below 744 only', async () => {
		unread = 0;
		draw('member');
		await waitFor(() => expect(calls).toHaveLength(1));
		expect(bell().tagName).toBe('A');
		expect(bell()).toHaveAttribute('href', '/notifications');
		expect(bell()).toHaveAccessibleName('Ειδοποιήσεις');
		expect(bell()).toHaveClass('size-touch');
		expect(bell().querySelector('span')).toHaveClass('size-inbox-glyph', 'rounded-full', 'bg-chip');
		expect(bell().className).not.toMatch(/hover:(bg|text|border)-/u);
		expect(screen.queryByTestId('profile-bell-dot')).toBeNull();
		// From 744 the «Προφίλ» has NO bell: the way to the list is the menu at the top right.
		expect(bell().parentElement).toHaveClass('tablet:hidden');
	});

	it('with something new: the dot on its rim, and its name says so — «Ειδοποιήσεις, νέες»; read, both go', async () => {
		const handle = draw('member');
		await waitFor(() => expect(bell()).toHaveAccessibleName('Ειδοποιήσεις, νέες'));
		const dot = screen.getByTestId('profile-bell-dot');
		expect(dot).toHaveAttribute('aria-hidden', 'true');
		expect(dot).toHaveClass('size-2.5', 'rounded-full', 'bg-accent', 'pointer-events-none');
		expect(bell()).toContainElement(dot);
		keepUnreadNotificationCount(handle().client, 0);
		await waitFor(() => expect(screen.queryByTestId('profile-bell-dot')).toBeNull());
		expect(bell()).toHaveAccessibleName('Ειδοποιήσεις');
	});

	it('(negative) a guest’s bell — were one ever drawn — shows no dot and asks nothing', async () => {
		draw('guest');
		await vi.advanceTimersByTimeAsync(MINUTE);
		expect(screen.queryByTestId('profile-bell-dot')).toBeNull();
		expect(bell()).toHaveAccessibleName('Ειδοποιήσεις');
		expect(calls).toEqual([]);
	});
});

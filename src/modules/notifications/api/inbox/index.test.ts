import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, type InfiniteData } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import {
	countUnreadNotifications,
	keepUnreadNotificationCount,
	listNotifications,
	mapNotificationInboxPage,
	mapUnreadCount,
	markAllNotificationsRead,
	markNotificationRead,
	notificationInboxKeys,
	notificationInboxQuery,
	notificationUnreadCountQuery,
	previewAllNotificationsRead,
	previewNotificationRead,
	readNotificationInboxFailure,
	type NotificationInboxPageFacts
} from '.';
import { SAMPLE_IDS, sampleInboxItem, sampleInboxItems, sampleInboxPage } from './inbox.sample';

/*
 * Wave 4.5 · screen 63 «Ειδοποιήσεις», the list (D-W45-46; `w45-b4` «Σύμβαση για τους clients»): the four calls, the
 * answer as facts, and what a press shows before the server answers. The server is stubbed; made-up people.
 */

afterEach(() => vi.unstubAllGlobals());

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });
const refusal = (status: number, errorCode?: string) =>
	new Response(JSON.stringify({ status: 'error', errorCode, errorMessage: 'no' }), { status });

type Call = { url: URL; init: RequestInit };

function server(answer: (call: Call) => Response | Promise<Response>) {
	const calls: Call[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const call = { url: new URL(url, 'https://api.test'), init };
			calls.push(call);
			return answer(call);
		})
	);
	return calls;
}

const client = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
type ListData = InfiniteData<NotificationInboxPageFacts, string | undefined>;

/** A client that has read «Νέες», «Προηγούμενες» and «Όλες» of the sample, and the count. */
function readClient() {
	const all = mapNotificationInboxPage(sampleInboxPage());
	const cache = client();
	const put = (filter: 'new' | 'previous' | 'all', items: NotificationInboxPageFacts['items']) =>
		cache.setQueryData<ListData>(notificationInboxKeys.list(filter, 'el'), {
			pages: [{ items, nextCursor: null, unreadCount: 3 }],
			pageParams: [undefined]
		});
	put(
		'new',
		all.items.filter((entry) => !entry.read)
	);
	put(
		'previous',
		all.items.filter((entry) => entry.read)
	);
	put('all', all.items);
	keepUnreadNotificationCount(cache, 3);
	const ids = (filter: 'new' | 'previous' | 'all') =>
		cache
			.getQueryData<ListData>(notificationInboxKeys.list(filter, 'el'))
			?.pages.flatMap((page) => page.items.map((entry) => `${entry.id}:${entry.read}`));
	return { cache, ids, count: () => cache.getQueryData(notificationInboxKeys.unread()) };
}

describe('modules/notifications/api/inbox · the answer as facts (W-4, U-65.6)', () => {
	it('a page maps to its lines in the server’s order: id, glyph, the server’s words as they came, the instant, read, the target — and nothing else of the answer', () => {
		const page = mapNotificationInboxPage(sampleInboxPage(undefined, { nextCursor: 'next-1' }));
		expect(page.items.map((entry) => entry.id)).toEqual([
			SAMPLE_IDS.confirmed,
			SAMPLE_IDS.reminder,
			SAMPLE_IDS.invitation,
			SAMPLE_IDS.published,
			SAMPLE_IDS.question
		]);
		expect(page.items[0]).toEqual({
			id: SAMPLE_IDS.confirmed,
			icon: 'CALENDAR',
			title: 'Το ραντεβού σας επιβεβαιώθηκε',
			body: '20/11/2026, 12:30 · Dr. Μαρία Τριανταφύλλου',
			occurredAt: Date.parse('2026-11-12T08:00:00.000Z'),
			read: false,
			target: { kind: 'APPOINTMENT', id: SAMPLE_IDS.appointment }
		});
		expect(page.nextCursor).toBe('next-1');
		expect(page.unreadCount).toBe(3);
		// The server's `kind` (its closed list of fifteen) is not the page's to keep: the words and the glyph say it.
		expect(Object.keys(page.items[0] ?? {})).not.toContain('kind');
	});

	it('🔴 `w45-b4`: a line’s second line MAY be empty (the two of the questions today) — it stays empty, never a made-up word', () => {
		const page = mapNotificationInboxPage(sampleInboxPage());
		expect(page.items.find((entry) => entry.id === SAMPLE_IDS.question)).toMatchObject({
			title: 'Η ερώτησή σας απαντήθηκε',
			body: '',
			icon: 'QUESTION',
			target: { kind: 'QUESTION', id: SAMPLE_IDS.questionTarget }
		});
	});

	it('🔴 U-65.6 (negative): a glyph or a target the contract does not name reads as none; a line without the server’s id or without a title is left out; a line told twice is kept once', () => {
		const page = mapNotificationInboxPage({
			items: [
				sampleInboxItem({ id: SAMPLE_IDS.confirmed, icon: 'ROCKET' }),
				sampleInboxItem({ id: SAMPLE_IDS.reminder, icon: 'toString' }),
				sampleInboxItem({
					id: SAMPLE_IDS.invitation,
					target: { kind: 'CONVERSATION', id: SAMPLE_IDS.appointment }
				}),
				sampleInboxItem({
					id: SAMPLE_IDS.published,
					target: { kind: 'APPOINTMENT', id: '../../auth/logout' }
				}),
				sampleInboxItem({ id: SAMPLE_IDS.question, target: null as never }),
				sampleInboxItem({ id: '../../auth/logout' }),
				sampleInboxItem({ id: '' }),
				sampleInboxItem({ id: SAMPLE_IDS.older, title: '   ' }),
				sampleInboxItem({ id: SAMPLE_IDS.confirmed, title: 'Δεύτερη φορά' }),
				{ ...sampleInboxItem({ id: SAMPLE_IDS.older }), id: 42 },
				null,
				'line',
				['line']
			],
			nextCursor: null,
			unreadCount: 2
		});
		expect(page.items.map((entry) => entry.id)).toEqual([
			SAMPLE_IDS.confirmed,
			SAMPLE_IDS.reminder,
			SAMPLE_IDS.invitation,
			SAMPLE_IDS.published,
			SAMPLE_IDS.question
		]);
		expect(page.items.slice(0, 2).map((entry) => entry.icon)).toEqual([null, null]);
		expect(page.items.slice(2).map((entry) => entry.target)).toEqual([null, null, null]);
		expect(page.items[0]?.title).toBe('Το ραντεβού σας επιβεβαιώθηκε');
	});

	it('🔴 U-65.6 (negative): only the server’s `true` is «read»; an instant that is none is `null`; words that are no text are empty; markup stays the text it is', () => {
		const page = mapNotificationInboxPage({
			items: [
				{ ...sampleInboxItem({ id: SAMPLE_IDS.confirmed }), read: 'true' },
				{ ...sampleInboxItem({ id: SAMPLE_IDS.reminder }), read: 1, occurredAt: 'tomorrow' },
				{ ...sampleInboxItem({ id: SAMPLE_IDS.invitation }), body: { html: '<b>x</b>' } },
				sampleInboxItem({
					id: SAMPLE_IDS.published,
					title: '<img src=x onerror=alert(1)>',
					body: '<script>alert(1)</script>',
					read: true
				})
			]
		});
		expect(page.items.map((entry) => entry.read)).toEqual([false, false, false, true]);
		expect(page.items[1]?.occurredAt).toBeNull();
		expect(page.items[2]?.body).toBe('');
		expect(page.items[3]).toMatchObject({
			title: '<img src=x onerror=alert(1)>',
			body: '<script>alert(1)</script>'
		});
	});

	it('(negative) an answer that is no page reads as an empty last one — never a throw; a page of 500 lines keeps the server’s own cap of 50; a cursor that is no cursor is none', () => {
		for (const broken of [null, undefined, 'page', 7, [], { items: 'lines' }, { items: null }]) {
			expect(mapNotificationInboxPage(broken)).toEqual({
				items: [],
				nextCursor: null,
				unreadCount: 0
			});
		}
		const many = Array.from({ length: 500 }, (_, index) =>
			sampleInboxItem({ id: `018f3c1e-0000-7000-8000-${String(index).padStart(12, '0')}` })
		);
		expect(mapNotificationInboxPage({ items: many }).items).toHaveLength(50);
		for (const cursor of ['', 'x'.repeat(513), 12, {}, null]) {
			expect(mapNotificationInboxPage({ items: [], nextCursor: cursor }).nextCursor).toBeNull();
		}
		expect(mapNotificationInboxPage({ items: [], nextCursor: 'x'.repeat(512) }).nextCursor).toBe(
			'x'.repeat(512)
		);
	});

	it('how many are new: a whole number of zero or more — (negative) a negative, a fraction, a word, nothing: none', () => {
		expect(mapUnreadCount(3)).toBe(3);
		expect(mapUnreadCount(0)).toBe(0);
		for (const broken of [-1, 1.5, '3', null, undefined, Number.NaN, Infinity, {}]) {
			expect(mapUnreadCount(broken)).toBe(0);
		}
	});
});

describe('modules/notifications/api/inbox · the four calls (D-W45-46)', () => {
	it('the list: `GET /notification/inbox/me` with the cookies and `filter`, `lang` (the PAGE’s language), `limit`, and the cursor only on a next page', async () => {
		const calls = server(() => json(sampleInboxPage()));
		const page = await listNotifications({ filter: 'new', lang: 'en' });
		await listNotifications({ filter: 'previous', lang: 'el', cursor: 'next-1' });
		expect(page.items).toHaveLength(5);
		expect(
			calls.map((call) => call.url.pathname.replace(/^.*\/notification/u, '/notification'))
		).toEqual(['/notification/inbox/me', '/notification/inbox/me']);
		expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({
			filter: 'new',
			lang: 'en',
			limit: '20'
		});
		expect(Object.fromEntries(calls[1].url.searchParams)).toEqual({
			filter: 'previous',
			lang: 'el',
			limit: '20',
			cursor: 'next-1'
		});
		for (const call of calls) {
			expect(call.init).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store' });
			expect(call.init.body).toBeUndefined();
		}
	});

	it('the count: `GET …/unread-count`, the number alone', async () => {
		const calls = server(() => json({ unreadCount: 4 }));
		expect(await countUnreadNotifications()).toBe(4);
		expect(calls[0].url.pathname).toMatch(/\/notification\/inbox\/me\/unread-count$/u);
		expect(calls[0].url.search).toBe('');
		expect(calls[0].init).toMatchObject({ method: 'GET', credentials: 'include' });
	});

	it('🔴 U-174: «read» is ONE `POST …/:id/read` with an empty body — the id in the path alone — and answers how many are still new', async () => {
		const calls = server(() => json({ id: SAMPLE_IDS.confirmed, read: true, unreadCount: 2 }));
		expect(await markNotificationRead(SAMPLE_IDS.confirmed)).toBe(2);
		expect(calls).toHaveLength(1);
		expect(calls[0].url.pathname).toMatch(
			new RegExp(`/notification/inbox/me/${SAMPLE_IDS.confirmed}/read$`, 'u')
		);
		expect(calls[0].url.search).toBe('');
		expect(calls[0].init).toMatchObject({ method: 'POST', credentials: 'include', body: '{}' });
	});

	it('«Σήμανση όλων ως διαβασμένων»: ONE `POST …/read-all` with an empty body', async () => {
		const calls = server(() => json({ marked: 3, unreadCount: 0 }));
		expect(await markAllNotificationsRead()).toBe(0);
		expect(calls).toHaveLength(1);
		expect(calls[0].url.pathname).toMatch(/\/notification\/inbox\/me\/read-all$/u);
		expect(calls[0].init).toMatchObject({ method: 'POST', credentials: 'include', body: '{}' });
	});

	it('🔴 U-65.6 (negative): an id that is not the server’s own shape never becomes a path — no request at all, told as the server’s «not found»', async () => {
		const calls = server(() => json({ unreadCount: 0 }));
		for (const id of [
			'',
			'read-all',
			'../read-all',
			'unread-count',
			'1',
			`${SAMPLE_IDS.confirmed}/x`
		]) {
			const failure = await markNotificationRead(id).catch((error: unknown) => error);
			expect(failure).toBeInstanceOf(ApiError);
			expect((failure as ApiError).status).toBe(404);
		}
		expect(calls).toHaveLength(0);
	});

	it('`w45-b4`: what a refused write is — `401` a session that ended; `404` a line that is not this account’s (unknown, another’s, not shown yet, past 90 days: ONE answer); anything else the same way', async () => {
		expect(readNotificationInboxFailure(new ApiError('no', 401, '/x', 'EC401'))).toBe('session');
		expect(readNotificationInboxFailure(new ApiError('no', 404, '/x', 'EC404'))).toBe('gone');
		for (const status of [0, 403, 422, 429, 500, 503]) {
			expect(readNotificationInboxFailure(new ApiError('no', status, '/x'))).toBe('unknown');
		}
		expect(readNotificationInboxFailure(new Error('x'))).toBe('unknown');
		expect(readNotificationInboxFailure(null)).toBe('unknown');

		server(() => refusal(404, 'EC404'));
		const gone = await markNotificationRead(SAMPLE_IDS.confirmed).catch((error: unknown) => error);
		expect(readNotificationInboxFailure(gone)).toBe('gone');
	});
});

describe('modules/notifications/api/inbox · the reads in the cache (D-W45-17, D-W45-49, U-65.6)', () => {
	it('🔴 D-W45-17: «how many are new» is ONE key for the whole site, personal, asked again whenever the page comes back to the front — and on no timer', () => {
		const query = notificationUnreadCountQuery();
		expect(query.queryKey).toEqual(['notifications', 'inbox', 'unread']);
		expect(query.queryKey).toEqual(notificationInboxKeys.unread());
		expect(query.meta).toEqual({ personal: true });
		expect(query.refetchOnWindowFocus).toBe('always');
		expect(query).not.toHaveProperty('refetchInterval');
	});

	it('the list: one place per choice and language, personal; the next page by the last one’s `nextCursor`, `undefined` at the end', () => {
		const query = notificationInboxQuery('previous', 'en');
		expect(query.queryKey).toEqual(['notifications', 'inbox', 'list', 'previous', 'en']);
		expect(query.meta).toEqual({ personal: true });
		expect(query.initialPageParam).toBeUndefined();
		const next = query.getNextPageParam as (page: NotificationInboxPageFacts) => unknown;
		expect(next({ items: [], nextCursor: 'next-1', unreadCount: 0 })).toBe('next-1');
		expect(next({ items: [], nextCursor: null, unreadCount: 0 })).toBeUndefined();
	});

	it('🔴 D-W45-49: every page of the list also says how many are new — it goes to the dots’ ONE place, no second request', async () => {
		const calls = server(() => json(sampleInboxPage(undefined, { unreadCount: 7 })));
		const cache = client();
		const data = await cache.fetchInfiniteQuery(notificationInboxQuery('all', 'el'));
		expect(data.pages[0]?.items).toHaveLength(5);
		expect(cache.getQueryData(notificationInboxKeys.unread())).toBe(7);
		expect(calls).toHaveLength(1);
		// 🔴 U-65.6: an answer that lands in an empty place is still the sign-out's to take.
		expect(cache.getQueryDefaults(notificationInboxKeys.unread()).meta).toEqual({
			personal: true
		});
	});

	it('🔴 U-174 (Ε2 Β): a press reads the line BEFORE the server answers — it leaves «Νέες», it is no longer new in «Όλες», one fewer is new; «Προηγούμενες» is not guessed', async () => {
		const { cache, ids, count } = readClient();
		await previewNotificationRead(cache, SAMPLE_IDS.reminder);
		expect(ids('new')).toEqual([`${SAMPLE_IDS.confirmed}:false`, `${SAMPLE_IDS.invitation}:false`]);
		expect(ids('all')).toEqual([
			`${SAMPLE_IDS.confirmed}:false`,
			`${SAMPLE_IDS.reminder}:true`,
			`${SAMPLE_IDS.invitation}:false`,
			`${SAMPLE_IDS.published}:true`,
			`${SAMPLE_IDS.question}:true`
		]);
		expect(ids('previous')).toEqual([
			`${SAMPLE_IDS.published}:true`,
			`${SAMPLE_IDS.question}:true`
		]);
		expect(count()).toBe(2);
	});

	it('🔴 U-174 (Ε2 Β), the way back: a write the server refuses puts every list and the count where they were', async () => {
		const { cache, ids, count } = readClient();
		const before = { new: ids('new'), all: ids('all'), previous: ids('previous') };
		const back = await previewNotificationRead(cache, SAMPLE_IDS.confirmed);
		expect(ids('new')).not.toEqual(before.new);
		back();
		expect({ new: ids('new'), all: ids('all'), previous: ids('previous') }).toEqual(before);
		expect(count()).toBe(3);
	});

	it('«Σήμανση όλων ως διαβασμένων» at the press: «Νέες» is empty, nothing is new in «Όλες», the count is none — and the way back restores all of it', async () => {
		const { cache, ids, count } = readClient();
		const before = { new: ids('new'), all: ids('all') };
		const back = await previewAllNotificationsRead(cache);
		expect(ids('new')).toEqual([]);
		expect(ids('all')?.every((entry) => entry.endsWith(':true'))).toBe(true);
		expect(count()).toBe(0);
		back();
		expect({ new: ids('new'), all: ids('all') }).toEqual(before);
		expect(count()).toBe(3);
	});

	it('(negative) a press with nothing read yet writes no list and invents no count; the count never goes below none', async () => {
		const empty = client();
		const back = await previewNotificationRead(empty, SAMPLE_IDS.confirmed);
		expect(empty.getQueriesData({ queryKey: notificationInboxKeys.lists() })).toEqual([]);
		expect(empty.getQueryData(notificationInboxKeys.unread())).toBeUndefined();
		back();
		expect(empty.getQueryData(notificationInboxKeys.unread())).toBeUndefined();

		const { cache, count } = readClient();
		keepUnreadNotificationCount(cache, 0);
		await previewNotificationRead(cache, SAMPLE_IDS.confirmed);
		expect(count()).toBe(0);
	});

	it('the sample is the server’s shape: every line has the eight fields of the contract', () => {
		for (const entry of sampleInboxItems()) {
			expect(Object.keys(entry).sort()).toEqual(
				['body', 'icon', 'id', 'kind', 'occurredAt', 'read', 'target', 'title'].sort()
			);
		}
	});
});

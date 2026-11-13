import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import {
	accountSessionsQuery,
	endAccountSession,
	mapAccountSessions,
	readSessionEndFailure,
	sessionDeviceBrowsers,
	sessionDeviceKinds,
	sessionDeviceSystems
} from '.';

/*
 * Wave 4.5 · screen 59 (D-W45-35, D-W45-40; the server's table in `reports/w45-b3.md`): the account's live sessions and
 * the end of ANOTHER one. Made-up ids; every answer here is written from the contract (`schema.ts`).
 */

const HERE = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a01';
const LAPTOP = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a02';
const OFFICE = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a03';

const wire = (overrides: Record<string, unknown> = {}) => ({
	sessionId: LAPTOP,
	current: false,
	lastActiveAt: '2026-10-30T08:21:00.000Z',
	kind: 'WEB',
	os: 'MACOS',
	browser: 'CHROME',
	...overrides
});

type Sent = { method: string; url: URL; body: unknown };
let sent: Sent[];
let answer: () => Response;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });
const refusal = (status: number, code?: string, message = 'refused') =>
	new ApiError(message, status, '/u', code);

beforeEach(() => {
	sent = [];
	answer = () => json({ sessions: [] });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			sent.push({
				method: init.method ?? 'GET',
				url: new URL(url),
				body: init.body ? JSON.parse(String(init.body)) : undefined
			});
			return answer();
		})
	);
});

afterEach(() => vi.unstubAllGlobals());

describe('auth::api::sessions · the read (D-W45-35, D-W45-40)', () => {
	it('a session as the page keeps it: its id, whether it is THIS one, the instant it was last active and the three words — nothing else of the answer', () => {
		expect(
			mapAccountSessions({
				sessions: [
					wire({
						sessionId: HERE,
						current: true,
						kind: 'APP',
						os: 'IOS',
						browser: null,
						userAgent: 'Mozilla/5.0',
						ip: '203.0.113.7'
					})
				]
			})
		).toEqual([
			{
				sessionId: HERE,
				current: true,
				lastActiveAt: Date.parse('2026-10-30T08:21:00.000Z'),
				kind: 'APP',
				os: 'IOS',
				browser: null
			}
		]);
	});

	it('every word of the three closed vocabularies is kept as it is', () => {
		for (const kind of sessionDeviceKinds) {
			for (const os of [...sessionDeviceSystems, 'OTHER'] as const) {
				for (const browser of [...sessionDeviceBrowsers, 'OTHER', null] as const) {
					expect(mapAccountSessions({ sessions: [wire({ kind, os, browser })] })).toEqual([
						expect.objectContaining({ kind, os, browser })
					]);
				}
			}
		}
	});

	it('🔴 D-W45-35 (negative): a word outside a vocabulary is `OTHER`, never the word itself — a new system, a User-Agent, markup, a number', () => {
		const [session] = mapAccountSessions({
			sessions: [
				wire({
					kind: 'WATCH',
					os: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
					browser: '<img src=x onerror=alert(1)>'
				})
			]
		}) as NonNullable<ReturnType<typeof mapAccountSessions>>;
		expect(session).toMatchObject({ kind: 'OTHER', os: 'OTHER', browser: 'OTHER' });
		expect(
			mapAccountSessions({ sessions: [wire({ kind: 7, os: null, browser: undefined })] })
		).toEqual([expect.objectContaining({ kind: 'OTHER', os: 'OTHER', browser: null })]);
		expect(mapAccountSessions({ sessions: [wire({ os: 'macos', browser: 'chrome' })] })).toEqual([
			expect.objectContaining({ os: 'OTHER', browser: 'OTHER' })
		]);
	});

	it('🔴 D-W45-40: THIS device comes first and is one at most — whatever order or marks the answer has', () => {
		const sessions = mapAccountSessions({
			sessions: [
				wire({ sessionId: LAPTOP }),
				wire({ sessionId: HERE, current: true }),
				wire({ sessionId: OFFICE, current: true })
			]
		});
		expect(sessions?.map((session) => [session.sessionId, session.current])).toEqual([
			[HERE, true],
			[LAPTOP, false],
			[OFFICE, false]
		]);
		// `current` is true only when the server says exactly so.
		expect(
			mapAccountSessions({ sessions: [wire({ current: 'true' }), wire({ sessionId: OFFICE })] })
		).toEqual([
			expect.objectContaining({ sessionId: LAPTOP, current: false }),
			expect.objectContaining({ sessionId: OFFICE, current: false })
		]);
	});

	it('🔴 U-65.6 (negative): an id that is not the server’s, an entry told twice, an entry that is no object and a date that is none — dropped or emptied, never thrown', () => {
		expect(
			mapAccountSessions({
				sessions: [
					wire({ sessionId: '../logout' }),
					wire({ sessionId: 'not-a-uuid' }),
					wire({ sessionId: 42 }),
					wire({ sessionId: undefined }),
					null,
					'x',
					wire({ sessionId: LAPTOP, lastActiveAt: 'yesterday' }),
					wire({ sessionId: LAPTOP, os: 'WINDOWS' }),
					wire({ sessionId: OFFICE, lastActiveAt: 1_762_000_000_000 })
				]
			})
		).toEqual([
			expect.objectContaining({ sessionId: LAPTOP, lastActiveAt: null, os: 'MACOS' }),
			expect.objectContaining({ sessionId: OFFICE, lastActiveAt: null })
		]);
	});

	it('(negative) an answer with no list is NO answer; a very long one is cut at the server’s own 50', () => {
		for (const broken of [null, undefined, 'ok', [], {}, { sessions: null }, { sessions: {} }]) {
			expect(mapAccountSessions(broken), JSON.stringify(broken)).toBeNull();
		}
		expect(mapAccountSessions({ sessions: [] })).toEqual([]);
		const many = Array.from({ length: 500 }, (_, index) =>
			wire({ sessionId: `0193a1b2-7c3d-7e4f-8a9b-${String(index).padStart(12, '0')}` })
		);
		expect(mapAccountSessions({ sessions: many })).toHaveLength(50);
	});

	it('the query: `GET /auth/sessions/me` with the cookies and no body; personal (gone at a sign-out); the cache keeps the facts alone', async () => {
		answer = () => json({ sessions: [wire({ sessionId: HERE, current: true })] });
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const options = accountSessionsQuery();
		expect(options.queryKey).toEqual(['auth', 'account-sessions']);
		expect(options.meta).toEqual({ personal: true });
		await expect(client.fetchQuery(options)).resolves.toEqual([
			expect.objectContaining({ sessionId: HERE, current: true })
		]);
		expect(sent).toHaveLength(1);
		expect(sent[0].method).toBe('GET');
		expect(sent[0].url.pathname).toMatch(/\/auth\/sessions\/me$/u);
		expect(sent[0].url.search).toBe('');
		expect(sent[0].body).toBeUndefined();
	});

	it('(negative) the query fails on an answer it cannot read, and on a refusal', async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		answer = () => json({ devices: [] });
		await expect(client.fetchQuery(accountSessionsQuery())).rejects.toThrow();
		answer = () => new Response(JSON.stringify({ errorCode: 'EC401' }), { status: 401 });
		await expect(client.fetchQuery(accountSessionsQuery())).rejects.toBeInstanceOf(ApiError);
	});
});

describe('auth::api::sessions · «Αποσύνδεση» of another device (D-W45-33, D-W45-40)', () => {
	it('`endAccountSession`: `POST /auth/sessions/me/<id>/end` — the id in the request’s PATH alone, the empty body the contract asks for, nothing of the answer handed back', async () => {
		answer = () => json({ sessionId: LAPTOP });
		await expect(endAccountSession(LAPTOP)).resolves.toBeUndefined();
		expect(sent).toHaveLength(1);
		expect(sent[0].method).toBe('POST');
		expect(sent[0].url.pathname).toMatch(new RegExp(`/auth/sessions/me/${LAPTOP}/end$`, 'u'));
		expect(sent[0].url.search).toBe('');
		expect(sent[0].body).toEqual({});
	});

	it('🔴 U-65.6 (negative): what is not a server id never becomes a request — a path out, another route, markup, nothing', async () => {
		for (const id of [
			'../../logout',
			'me',
			'',
			' ',
			'<script>',
			`${LAPTOP}/../x`,
			`${LAPTOP}?all=1`
		]) {
			await expect(endAccountSession(id), id).rejects.toBeInstanceOf(ApiError);
		}
		expect(sent).toEqual([]);
	});

	it('the refusals, by the server’s own table', () => {
		expect(readSessionEndFailure(refusal(404, 'EC404', 'Resource not found'))).toBe('gone');
		expect(
			readSessionEndFailure(refusal(403, 'EC403', 'Forbidden: SESSION_END_REFUSED:CURRENT_SESSION'))
		).toBe('current');
		expect(readSessionEndFailure(refusal(429, 'EC429'))).toBe('rate-limited');
		expect(readSessionEndFailure(refusal(401, 'EC401'))).toBe('session');
		expect(readSessionEndFailure(refusal(422, 'EC423'))).toBe('unknown');
		expect(readSessionEndFailure(refusal(503))).toBe('unknown');
		expect(readSessionEndFailure(refusal(0))).toBe('unknown');
		expect(readSessionEndFailure(new Error('x'))).toBe('unknown');
	});

	it('🔴 (negative) a `401` that is not `EC401` is no end of the session, and a `403` without the server’s words is not «this device»', () => {
		expect(readSessionEndFailure(refusal(401, 'EC412'))).toBe('unknown');
		expect(readSessionEndFailure(refusal(401, 'EC011'))).toBe('unknown');
		expect(readSessionEndFailure(refusal(401))).toBe('unknown');
		expect(readSessionEndFailure(refusal(403, 'EC403', 'Forbidden'))).toBe('unknown');
	});
});

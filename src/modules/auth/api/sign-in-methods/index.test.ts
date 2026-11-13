import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import {
	mapSignInMethods,
	readProviderUnlinkFailure,
	signInMethodsQuery,
	unlinkSignInProvider
} from '.';

/*
 * Wave 4.5 · screen 59 (D-W45-37, D-W45-38; the server's table in `reports/w45-b3.md`): the account's own sign-in
 * methods and the unlink of a provider. Every answer here is written from the contract (`schema.ts`).
 */

type Sent = { method: string; url: URL; body: unknown };
let sent: Sent[];
let answer: () => Response;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });
const refusal = (status: number, code?: string, message = 'refused') =>
	new ApiError(message, status, '/u', code);

beforeEach(() => {
	sent = [];
	answer = () => json({ passwordStatus: { set: true, canSet: true }, providers: [] });
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

describe('auth::api::sign-in-methods · the read (D-W45-37)', () => {
	it.each([
		[true, true],
		[true, false],
		[false, true],
		[false, false]
	])('`passwordStatus` set %s / canSet %s is kept as the server says it', (set, canSet) => {
		expect(mapSignInMethods({ passwordStatus: { set, canSet }, providers: [] })).toEqual({
			passwordStatus: { set, canSet },
			providers: []
		});
	});

	it('only the linked providers, `GOOGLE` before `APPLE`, each with whether it may be unlinked; `refusal` is not kept (the page writes its own words)', () => {
		expect(
			mapSignInMethods({
				passwordStatus: { set: false, canSet: false },
				providers: [
					{ provider: 'APPLE', canUnlink: false, refusal: 'NO_OTHER_SIGN_IN' },
					{ provider: 'GOOGLE', canUnlink: true, refusal: null }
				]
			})
		).toEqual({
			passwordStatus: { set: false, canSet: false },
			providers: [
				{ provider: 'GOOGLE', canUnlink: true },
				{ provider: 'APPLE', canUnlink: false }
			]
		});
	});

	it('🔴 U-65.6 (negative): a provider outside the closed list, one told twice, markup, a `canUnlink` that is not exactly `true` — none reaches the page as it came', () => {
		const facts = mapSignInMethods({
			passwordStatus: { set: true, canSet: true },
			providers: [
				{ provider: 'FACEBOOK', canUnlink: true },
				{ provider: '<img src=x onerror=alert(1)>', canUnlink: true },
				{ provider: 'google', canUnlink: true },
				{ provider: 'GOOGLE', canUnlink: 'yes' },
				{ provider: 'GOOGLE', canUnlink: true },
				null,
				'APPLE',
				{ provider: '__proto__', canUnlink: true }
			]
		});
		expect(facts?.providers).toEqual([{ provider: 'GOOGLE', canUnlink: false }]);
	});

	it('🔴 (negative) an answer that says nothing of the password is NO answer — never «Δεν έχει οριστεί» by default', () => {
		for (const broken of [
			null,
			undefined,
			'ok',
			[],
			{},
			{ providers: [] },
			{ passwordStatus: null, providers: [] },
			{ passwordStatus: { set: 'true', canSet: true }, providers: [] },
			{ passwordStatus: { set: true }, providers: [] },
			{ password: { set: true, canSet: true }, providers: [] }
		]) {
			expect(mapSignInMethods(broken), JSON.stringify(broken)).toBeNull();
		}
		// A list that is no list is no provider, and still an answer.
		expect(
			mapSignInMethods({ passwordStatus: { set: true, canSet: false }, providers: 'GOOGLE' })
		).toEqual({ passwordStatus: { set: true, canSet: false }, providers: [] });
	});

	it('the query: `GET /auth/sign-in-methods/me` with the cookies and no body; personal (gone at a sign-out); the cache keeps the facts alone', async () => {
		answer = () =>
			json({
				passwordStatus: { set: true, canSet: true },
				providers: [{ provider: 'GOOGLE', canUnlink: true, refusal: null }]
			});
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const options = signInMethodsQuery();
		expect(options.queryKey).toEqual(['auth', 'sign-in-methods']);
		expect(options.meta).toEqual({ personal: true });
		await expect(client.fetchQuery(options)).resolves.toEqual({
			passwordStatus: { set: true, canSet: true },
			providers: [{ provider: 'GOOGLE', canUnlink: true }]
		});
		expect(sent).toHaveLength(1);
		expect(sent[0].method).toBe('GET');
		expect(sent[0].url.pathname).toMatch(/\/auth\/sign-in-methods\/me$/u);
		expect(sent[0].url.search).toBe('');
		expect(sent[0].body).toBeUndefined();
	});

	it('(negative) the query fails on an answer it cannot read, and on a refusal', async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		answer = () => json({ providers: [] });
		await expect(client.fetchQuery(signInMethodsQuery())).rejects.toThrow();
		answer = () => new Response(JSON.stringify({ errorCode: 'EC401' }), { status: 401 });
		await expect(client.fetchQuery(signInMethodsQuery())).rejects.toBeInstanceOf(ApiError);
	});
});

describe('auth::api::sign-in-methods · «Αποσύνδεση» of a provider (D-W45-38)', () => {
	it.each(['GOOGLE', 'APPLE'] as const)(
		'`unlinkSignInProvider(%s)`: `POST …/me/providers/%s/unlink` with the empty body the contract asks for, and nothing of the answer handed back',
		async (provider) => {
			answer = () => json({ provider });
			await expect(unlinkSignInProvider(provider)).resolves.toBeUndefined();
			expect(sent).toHaveLength(1);
			expect(sent[0].method).toBe('POST');
			expect(sent[0].url.pathname).toMatch(
				new RegExp(`/auth/sign-in-methods/me/providers/${provider}/unlink$`, 'u')
			);
			expect(sent[0].url.search).toBe('');
			expect(sent[0].body).toEqual({});
		}
	);

	it('the refusals, by the server’s own table', () => {
		expect(
			readProviderUnlinkFailure(
				refusal(403, 'EC403', 'Forbidden: SIGN_IN_PROVIDER_UNLINK_REFUSED:NO_OTHER_SIGN_IN')
			)
		).toBe('refused');
		expect(readProviderUnlinkFailure(refusal(404, 'EC404', 'Resource not found'))).toBe('gone');
		expect(readProviderUnlinkFailure(refusal(429, 'EC429'))).toBe('rate-limited');
		expect(readProviderUnlinkFailure(refusal(401, 'EC401'))).toBe('session');
		expect(readProviderUnlinkFailure(refusal(422, 'EC423'))).toBe('unknown');
		expect(readProviderUnlinkFailure(refusal(500))).toBe('unknown');
		expect(readProviderUnlinkFailure(refusal(0))).toBe('unknown');
		expect(readProviderUnlinkFailure(new Error('x'))).toBe('unknown');
	});

	it('🔴 (negative) the SAME `403` without the refusal’s words is not the block of D-W45-38, and a `401` that is not `EC401` is no end of the session', () => {
		expect(readProviderUnlinkFailure(refusal(403, 'EC403', 'Forbidden'))).toBe('unknown');
		expect(
			readProviderUnlinkFailure(
				refusal(403, 'EC403', 'Forbidden: SESSION_END_REFUSED:CURRENT_SESSION')
			)
		).toBe('unknown');
		expect(
			readProviderUnlinkFailure(
				refusal(400, 'EC400', 'SIGN_IN_PROVIDER_UNLINK_REFUSED:NO_OTHER_SIGN_IN')
			)
		).toBe('unknown');
		expect(readProviderUnlinkFailure(refusal(401, 'EC412'))).toBe('unknown');
		expect(readProviderUnlinkFailure(refusal(401))).toBe('unknown');
	});
});

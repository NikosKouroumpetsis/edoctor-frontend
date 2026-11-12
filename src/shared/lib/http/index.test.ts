import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	ApiError,
	httpGet,
	httpGetWithMeta,
	httpPublicPut,
	httpSessionDelete,
	httpSessionFile,
	httpSessionGet,
	httpSessionPatch,
	httpSessionPost,
	httpSessionPut,
	requestLanguageHeaders
} from '.';

const answer = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const stubFetch = (response: Response | Error) => {
	const spy = vi.fn(async () => {
		if (response instanceof Error) throw response;
		return response;
	});
	vi.stubGlobal('fetch', spy);
	return spy;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('the session’s requests (U-80.1 Ε6)', () => {
	it('U-80.1 Ε6: only a session call carries the cookies; a public read stays anonymous', async () => {
		const spy = stubFetch(answer(200, { status: 'ok', data: 1 }));
		await httpGet('/doctor/public/doctors');
		expect(spy.mock.calls[0] as unknown[]).toEqual([
			expect.any(String),
			expect.objectContaining({ credentials: 'omit' })
		]);
		stubFetch(answer(200, { status: 'ok', data: { id: 'p' } }));
		const session = vi.mocked(fetch);
		await expect(httpSessionGet('/patient/me')).resolves.toEqual({ id: 'p' });
		expect(session.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', credentials: 'include' });
	});

	it('🔴 U-34.4 (Σ2): a public read through SvelteKit’s server `fetch` says `omit`, so the browser’s cookies stay behind and the rows are the guest’s', async () => {
		const serverFetch = vi.fn<typeof fetch>(async () =>
			answer(200, { status: 'ok', data: [], meta: { total: 0 } })
		);
		await httpGet('/doctor/public/doctors', { fetch: serverFetch });
		await httpGetWithMeta('/article/public/articles', { fetch: serverFetch });
		expect(serverFetch.mock.calls.map(([, init]) => init?.credentials)).toEqual(['omit', 'omit']);
		expect(new Headers(serverFetch.mock.calls[0][1]?.headers).has('cookie')).toBe(false);
	});

	it('🔴 D-W4-60 (security review of the web, MINOR-1): every call with the cookies — a read, a write, a file — says `cache: no-store`, so a personal answer is never kept in the browser’s HTTP cache past the sign-out', async () => {
		const calls: Record<string, () => Promise<unknown>> = {
			get: () => httpSessionGet('/patient/p-1/relatives'),
			post: () =>
				httpSessionPost('/appointment-rating/rating-invitations/i-1/submit', { body: {} }),
			put: () => httpSessionPut('/patient/favorites/doctors/d-1'),
			patch: () =>
				httpSessionPatch('/appointment/appointments/a-1', { body: { patientNote: 'x' } }),
			delete: () => httpSessionDelete('/patient/p-1/relatives/r-1'),
			file: () => httpSessionFile('/messages/conversations/c-1/export')
		};
		for (const [name, call] of Object.entries(calls)) {
			const spy = stubFetch(answer(200, { status: 'ok', data: {} }));
			await call();
			const init = (spy.mock.calls[0] as unknown as [string, RequestInit])[1];
			expect(init.cache, name).toBe('no-store');
			expect(init.credentials, name).toBe('include');
		}
	});

	it('D-W4-60 (negative): a public, anonymous read keeps the browser’s own caching — `no-store` is the session’s alone', async () => {
		const spy = stubFetch(answer(200, { status: 'ok', data: 1 }));
		await httpGet('/doctor/public/doctors');
		const init = (spy.mock.calls[0] as unknown as [string, RequestInit])[1];
		expect(init.cache).toBeUndefined();
		expect(init.credentials).toBe('omit');
	});

	it('a write sends its JSON body with the cookies', async () => {
		const spy = stubFetch(answer(200, { status: 'ok', data: { success: true } }));
		await httpSessionPost('/auth/access/start', { body: { email: 'a@b.gr' } });
		expect(spy.mock.calls[0] as unknown[]).toEqual([
			expect.stringContaining('/auth/access/start'),
			expect.objectContaining({
				method: 'POST',
				credentials: 'include',
				body: JSON.stringify({ email: 'a@b.gr' })
			})
		]);
	});

	it('a refusal keeps the status, the backend’s code and its message', async () => {
		stubFetch(answer(400, { errorCode: 'EC011', errorMessage: ' wrong code ' }));
		const error = await httpSessionPost('/auth/access/verify').catch((failure) => failure);
		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({ status: 400, errorCode: 'EC011', message: 'wrong code' });
	});

	it('(negative) a refusal that is not JSON has no code; no network is status 0', async () => {
		stubFetch(new Response('<html>', { status: 502 }));
		const bad = await httpSessionGet('/patient/me').catch((failure: ApiError) => failure);
		expect(bad).toMatchObject({ status: 502 });
		expect((bad as ApiError).errorCode).toBeUndefined();
		stubFetch(new TypeError('offline'));
		await expect(httpSessionGet('/patient/me')).rejects.toMatchObject({ status: 0 });
	});
});

describe('the writes that name everything in their address (U-85)', () => {
	it('U-65.6: a `PUT` without a body sends none and no content type, with the cookies', async () => {
		const spy = stubFetch(answer(200, { status: 'ok', data: { doctorId: 'd' } }));
		await expect(httpSessionPut('/patient/me/favorites/d')).resolves.toEqual({ doctorId: 'd' });
		const init = (spy.mock.calls[0] as unknown as [string, RequestInit])[1];
		expect(init.method).toBe('PUT');
		expect(init.credentials).toBe('include');
		expect(init.body).toBeUndefined();
		expect(init.headers).not.toHaveProperty('Content-Type');
	});

	it('a `DELETE` that answers `204` reads nothing and resolves', async () => {
		const spy = stubFetch(new Response(null, { status: 204 }));
		await expect(httpSessionDelete('/patient/me/favorites/d')).resolves.toBeUndefined();
		const init = (spy.mock.calls[0] as unknown as [string, RequestInit])[1];
		expect(init.method).toBe('DELETE');
		expect(init.body).toBeUndefined();
	});

	it('(negative) a refusal keeps its status and the server’s code', async () => {
		stubFetch(answer(409, { errorCode: 'FAVORITES_LIMIT_REACHED', errorMessage: 'limit' }));
		const error: unknown = await httpSessionPut('/patient/me/favorites/d').catch(
			(failure) => failure
		);
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).status).toBe(409);
		expect((error as ApiError).errorCode).toBe('FAVORITES_LIMIT_REACHED');
	});
});

describe('a partial write of the person’s own facts (wave 3, the booking)', () => {
	it('a `PATCH` sends its JSON body with the cookies and reads the answer', async () => {
		const spy = stubFetch(answer(200, { status: 'ok', data: { id: 'p' } }));
		await expect(
			httpSessionPatch('/patient/me/profile', { body: { firstName: 'Ελένη' } })
		).resolves.toEqual({ id: 'p' });
		const init = (spy.mock.calls[0] as unknown as [string, RequestInit])[1];
		expect(init).toMatchObject({
			method: 'PATCH',
			credentials: 'include',
			body: JSON.stringify({ firstName: 'Ελένη' })
		});
		expect(init.headers).toHaveProperty('Content-Type', 'application/json');
	});

	it('(negative) a refused `PATCH` keeps its status and the server’s code', async () => {
		stubFetch(answer(422, { errorCode: 'EC010', errorMessage: 'dateOfBirth' }));
		const error: unknown = await httpSessionPatch('/patient/me/profile', {
			body: { dateOfBirth: 'x' }
		}).catch((failure) => failure);
		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({ status: 422, errorCode: 'EC010' });
	});
});

describe('a public write (U-78)', () => {
	it('U-78.1 Ε2: it never carries the cookies; the device’s key goes in a header, never in the address', async () => {
		const spy = stubFetch(answer(200, { status: 'ok', data: { value: 'up' } }));
		await httpPublicPut('/helpful-votes/public/vote', {
			body: { value: 'up' },
			headers: { 'X-Helpful-Voter': 'key' }
		});
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).not.toContain('key');
		expect(init.credentials).toBe('omit');
		expect(init.headers).toMatchObject({ 'X-Helpful-Voter': 'key' });
		expect(init.body).toBe('{"value":"up"}');
	});

	it('(negative) a refusal is an error with its status; no network is status 0', async () => {
		stubFetch(answer(429, {}));
		const refused: unknown = await httpPublicPut('/v', { body: {} }).catch((failure) => failure);
		expect(refused).toBeInstanceOf(ApiError);
		expect((refused as ApiError).status).toBe(429);
		stubFetch(new TypeError('offline'));
		const offline: unknown = await httpPublicPut('/v', { body: {} }).catch((failure) => failure);
		expect((offline as ApiError).status).toBe(0);
	});

	it('a read may name its headers and leave the cookies behind', async () => {
		const spy = stubFetch(answer(200, { status: 'ok', data: [] }));
		await httpGet('/helpful-votes/public/vote/mine', {
			headers: { 'X-Helpful-Voter': 'key' },
			credentials: 'omit'
		});
		const init = (spy.mock.calls[0] as unknown as [string, RequestInit])[1];
		expect(init.credentials).toBe('omit');
		expect(init.headers).toMatchObject({ 'X-Helpful-Voter': 'key' });
	});
});

describe('🔴 D-W3-39: every request says the PAGE’s language (review w3-w6 R1 MAJOR-N1)', () => {
	afterEach(() => {
		window.history.replaceState(null, '', '/');
	});

	/** Every kind of call once: a public read, a session read and write, a session file, a public write. */
	async function languagesSent(): Promise<(string | null)[]> {
		const spy = vi.fn<typeof fetch>(
			async () =>
				new Response(JSON.stringify({ status: 'ok', data: {} }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
		);
		vi.stubGlobal('fetch', spy);
		await httpGet('/doctor/public/doctors');
		await httpSessionGet('/patient/me');
		await httpSessionPost('/auth/access/start', { body: { email: 'a@b.gr' } });
		await httpSessionFile('/messages/conversations/c/export');
		await httpPublicPut('/helpful-votes/public/vote', { body: { up: true } });
		return spy.mock.calls.map(([, init]) => new Headers(init?.headers).get('Accept-Language'));
	}

	it('a Greek page (`/…`) says `el` on all of them, an English one (`/en/…`) `en` — one word, never the browser’s list', async () => {
		window.history.replaceState(null, '', '/doctors');
		expect(await languagesSent()).toEqual(['el', 'el', 'el', 'el', 'el']);
		window.history.replaceState(null, '', '/en/doctors');
		expect(await languagesSent()).toEqual(['en', 'en', 'en', 'en', 'en']);
		expect(requestLanguageHeaders()).toEqual({ 'Accept-Language': 'en' });
	});

	it('(negative) the query never names the language — `/doctors?lang=en` stays Greek; an unknown prefix (`/fr/…`) is the base, Greek', async () => {
		window.history.replaceState(null, '', '/doctors?lang=en');
		expect(requestLanguageHeaders()).toEqual({ 'Accept-Language': 'el' });
		window.history.replaceState(null, '', '/fr/doctors');
		expect(requestLanguageHeaders()).toEqual({ 'Accept-Language': 'el' });
	});
});

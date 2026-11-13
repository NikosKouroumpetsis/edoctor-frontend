import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { accountLocaleQuery, mapAccountLocale, updateAccountLocale } from '.';

afterEach(() => vi.unstubAllGlobals());

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });

describe('modules/profile/api/user · the account’s language (D-W45-06, `GET` / `PUT /user/me`)', () => {
	it('maps the stored language; an account with no profile yet, or one that names none, has none', () => {
		expect(mapAccountLocale({ id: 'u-1', locale: 'en' })).toEqual({ locale: 'en' });
		expect(mapAccountLocale({ id: 'u-1', locale: 'el' })).toEqual({ locale: 'el' });
		expect(mapAccountLocale({ id: 'u-1', locale: null })).toEqual({ locale: null });
		expect(mapAccountLocale(null)).toEqual({ locale: null });
	});

	it('🔴 U-169 / U-65.6: ΜΟΝΟ η γλώσσα μένει — of the whole profile (a date of birth, a gender, a photo, a text, ids) nothing but `locale` leaves `api/` or reaches the cache', async () => {
		// Made-up values: no person's facts.
		const view = {
			id: 'u-1',
			tenantUserId: 't-1',
			gender: 'FEMALE',
			dateOfBirth: '1988-03-14T00:00:00.000Z',
			avatarUrl: 'https://cdn.example.test/a.jpg',
			headline: 'κάτι',
			bio: 'κάτι άλλο',
			locale: 'el',
			translations: [{ languageCode: 'el', firstName: 'Ελένη', lastName: 'Παππά' }]
		};
		expect(mapAccountLocale(view)).toEqual({ locale: 'el' });
		const spy = vi.fn(async () => json(view));
		vi.stubGlobal('fetch', spy);
		const query = accountLocaleQuery();
		const kept = await (query.queryFn as (context: { signal: AbortSignal }) => Promise<unknown>)({
			signal: new AbortController().signal
		});
		expect(kept).toEqual({ locale: 'el' });
		expect(JSON.stringify(kept)).not.toMatch(/1988|FEMALE|Ελένη|cdn\.example|u-1|t-1/u);
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/user/me');
		expect(init).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store' });
	});

	it('🔴 U-65.6: the read is personal (a sign-out removes it), under the module’s one root', () => {
		expect(accountLocaleQuery().meta).toEqual({ personal: true });
		expect(accountLocaleQuery().queryKey).toEqual(['profile', 'account-locale']);
	});

	it('W-4 (negative): another word, another case, a number, a list, a text or nothing reads as no language — never a throw, never free text kept', () => {
		for (const view of [
			{ locale: 'fr' },
			{ locale: 'EL' },
			{ locale: 'el ' },
			{ locale: 7 },
			{ locale: ['el'] },
			{ locale: { code: 'el' } },
			{ locale: '<script>alert(1)</script>' },
			{},
			[],
			[{ locale: 'el' }],
			'el',
			7,
			undefined
		]) {
			expect(mapAccountLocale(view), JSON.stringify(view)).toEqual({ locale: null });
		}
	});

	it('D-W45-06: the write is a `PUT /user/me` with the cookies and `locale` ALONE (the body is a patch: nothing else of the profile travels)', async () => {
		const spy = vi.fn(async () => json({ id: 'u-1', locale: 'en', dateOfBirth: '1988-03-14' }));
		vi.stubGlobal('fetch', spy);
		await expect(updateAccountLocale('en')).resolves.toBeUndefined();
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(new URL(url, 'https://api.test').pathname).toMatch(/\/user\/me$/u);
		expect(new URL(url, 'https://api.test').search).toBe('');
		expect(init).toMatchObject({ method: 'PUT', credentials: 'include', cache: 'no-store' });
		expect(JSON.parse(String(init.body))).toEqual({ locale: 'en' });
	});

	it('(negative) a refusal is still one — the `422` of a write that changes nothing, the `401` of an ended session, an outage — for the caller to pass by', async () => {
		for (const status of [422, 401, 503]) {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response(JSON.stringify({ errorCode: 'EC000' }), { status }))
			);
			await expect(updateAccountLocale('el')).rejects.toBeInstanceOf(ApiError);
		}
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('offline');
			})
		);
		await expect(updateAccountLocale('el')).rejects.toBeInstanceOf(ApiError);
	});
});

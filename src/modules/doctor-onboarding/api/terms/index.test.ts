import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { doctorTermsVersionQuery, getDoctorTermsVersion } from '.';

afterEach(() => vi.unstubAllGlobals());

function serve(data: unknown) {
	const calls: { url: string; init: RequestInit }[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit) => {
			calls.push({ url, init });
			return new Response(JSON.stringify({ status: 'success', message: '', data }));
		})
	);
	return calls;
}

describe('doctor-onboarding · api/terms (Ε2, D-W3-01: the doctors’ terms only, at the version in force)', () => {
	it('the doctors’ terms’ public page, in the page’s language, without the cookies: its version', async () => {
		const calls = serve({ slug: 'doctor-marketplace-terms', version: '2026-11' });
		expect(await getDoctorTermsVersion('en')).toBe('2026-11');
		const url = new URL(calls[0].url);
		expect(url.pathname).toMatch(/\/content\/public\/pages\/doctor-marketplace-terms$/u);
		expect(Object.fromEntries(url.searchParams)).toEqual({ lang: 'en' });
		expect(calls[0].init.credentials).toBe('omit');
	});

	it('(negative) a page with no version, a blank one or one that is no text is no version', async () => {
		serve({ slug: 'doctor-marketplace-terms' });
		expect(await getDoctorTermsVersion('el')).toBeNull();
		serve({ version: '  ' });
		expect(await getDoctorTermsVersion('el')).toBeNull();
		serve({ version: 3 });
		expect(await getDoctorTermsVersion('el')).toBeNull();
		serve(null);
		expect(await getDoctorTermsVersion('el')).toBeNull();
	});

	it('read when asked: a minute’s copy, none for the retry (`refresh`); the sign-out’s mark; no retry of its own', async () => {
		const calls = serve({ version: '1.0' });
		const client = new QueryClient();
		expect(await client.fetchQuery(doctorTermsVersionQuery('el'))).toBe('1.0');
		expect(await client.fetchQuery(doctorTermsVersionQuery('el'))).toBe('1.0');
		expect(calls).toHaveLength(1);
		expect(await client.fetchQuery(doctorTermsVersionQuery('el', true))).toBe('1.0');
		expect(calls).toHaveLength(2);
		const options = doctorTermsVersionQuery('el');
		expect(options.meta).toBe(personalQueryMeta);
		expect(options.retry).toBe(0);
		expect(options.queryKey).toEqual(['doctor-onboarding', 'terms-version', 'el']);
	});
});

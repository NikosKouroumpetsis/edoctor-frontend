import { afterEach, describe, expect, it, vi } from 'vitest';
import { doctorPublicProfileQuery } from './queries';

afterEach(() => vi.unstubAllGlobals());

function envelope(data: unknown, status = 200): Response {
	return new Response(JSON.stringify({ status: 'success', message: 'ok', data }), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

const run = (query: ReturnType<typeof doctorPublicProfileQuery>) =>
	(query.queryFn as (context: { signal: AbortSignal }) => Promise<unknown>)({
		signal: new AbortController().signal
	});

describe('D-W4-29 · the doctor of a patient’s appointment, by its id', () => {
	it('🔴 P-W4 Σ-5: a key of its own, personal (gone at a sign-out), never again by itself (D-103)', () => {
		const query = doctorPublicProfileQuery('doc-1', 'el');
		expect(query.queryKey).toEqual(['doctor', 'public-profile', 'doc-1', 'el']);
		expect(query.meta).toEqual({ personal: true });
		expect(query).toMatchObject({ refetchOnWindowFocus: false, refetchOnReconnect: false });
	});

	it('ONE anonymous read of the public profile (no cookies), the id path-encoded, in the page’s language', async () => {
		const spy = vi.fn(async () =>
			envelope({ doctor: { doctorId: 'doc-1', slug: 'dr-maria', fullName: 'Μαρία Τριανταφύλλου' } })
		);
		vi.stubGlobal('fetch', spy);
		await expect(run(doctorPublicProfileQuery('doc/1', 'en'))).resolves.toMatchObject({
			doctorSlug: 'dr-maria',
			name: 'Μαρία Τριανταφύλλου'
		});
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/doctor/public/doctors/doc%2F1');
		expect(new URL(url).searchParams.get('lang')).toBe('en');
		expect(init.credentials).toBe('omit');
	});

	it('(negative) a doctor nobody may see is none (the card leaves the line out); any other failure is the read’s error', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => envelope({ doctor: null }))
		);
		await expect(run(doctorPublicProfileQuery('doc-1', 'el'))).resolves.toBeNull();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => envelope({}, 404))
		);
		await expect(run(doctorPublicProfileQuery('doc-1', 'el'))).resolves.toBeNull();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => envelope({}, 503))
		);
		await expect(run(doctorPublicProfileQuery('doc-1', 'el'))).rejects.toThrow();
	});
});

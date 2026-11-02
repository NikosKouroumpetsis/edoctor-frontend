import { describe, expect, it, vi } from 'vitest';
import { load as loadProfile } from './+page.server';
import { load as loadDetails } from './details/[section]/+page.server';

/** The address a load reads, every property it touches written down (SvelteKit tracks the same ones). */
function trackedUrl(href: string) {
	const real = new URL(href);
	const reads: string[] = [];
	const url = new Proxy(real, {
		get(target, key) {
			if (typeof key === 'string') reads.push(key);
			const value = Reflect.get(target, key);
			return typeof value === 'function' ? value.bind(target) : value;
		}
	});
	return { url, reads };
}

/** The backend's answer, a stand-in: the request is recorded, nothing leaves the test. */
function backend(status: number) {
	return vi.fn<(input: RequestInfo | URL) => Promise<Response>>(
		async () => new Response('{}', { status })
	);
}

async function statusOf(run: () => unknown): Promise<number | undefined> {
	try {
		await run();
	} catch (thrown) {
		return (thrown as { status?: number }).status;
	}
	return undefined;
}

describe('routes/doctors/[slug] load (the profile on the server)', () => {
	it('MAJOR-1 of r1: the language is the address’s PATH — read, so a change of language reads the profile again; `/en/…` asks the English copy', async () => {
		for (const run of [loadProfile, loadDetails]) {
			const { url, reads } = trackedUrl('http://localhost/en/doctors/dr-athena?office=off-2');
			const fetch = backend(404);
			await statusOf(() =>
				run({
					fetch,
					params: { slug: 'dr-athena', section: 'reviews' },
					url
				} as never)
			);
			expect(reads).toContain('pathname');
			const request = String(fetch.mock.calls[0]?.[0]);
			expect(new URL(request).searchParams.get('lang')).toBe('en');
		}
		const { url } = trackedUrl('http://localhost/doctors/dr-athena');
		const fetch = backend(404);
		await statusOf(() => loadProfile({ fetch, params: { slug: 'dr-athena' }, url } as never));
		expect(new URL(String(fetch.mock.calls[0]?.[0])).searchParams.get('lang')).toBe('el');
	});

	it('MAJOR-1 of r1 (negative): the load never reads the query — a window’s `?office=` opened in place asks nothing of the server', async () => {
		for (const run of [loadProfile, loadDetails]) {
			const { url, reads } = trackedUrl('http://localhost/doctors/dr-athena?office=off-2');
			await statusOf(() =>
				run({
					fetch: backend(404),
					params: { slug: 'dr-athena', section: 'reviews' },
					url
				} as never)
			);
			expect(reads).not.toContain('search');
			expect(reads).not.toContain('searchParams');
			expect(reads).not.toContain('href');
		}
	});

	it('MINOR-6 of r1: a profile nobody may see is a 404, a failed read a 503 — the error page, never a page of 200', async () => {
		const { url } = trackedUrl('http://localhost/doctors/dr-athena');
		const event = (status: number) =>
			({ fetch: backend(status), params: { slug: 'dr-athena', section: 'reviews' }, url }) as never;
		expect(await statusOf(() => loadProfile(event(404)))).toBe(404);
		expect(await statusOf(() => loadProfile(event(500)))).toBe(503);
		expect(await statusOf(() => loadDetails(event(404)))).toBe(404);
		expect(await statusOf(() => loadDetails(event(502)))).toBe(503);
		const unknownSection = {
			fetch: backend(200),
			params: { slug: 'dr-athena', section: 'articles' },
			url
		} as never;
		expect(await statusOf(() => loadDetails(unknownSection))).toBe(404);
	});
});

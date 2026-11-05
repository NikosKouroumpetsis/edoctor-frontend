import { describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

const run = (section: string, href: string, fetch: typeof globalThis.fetch = vi.fn()) =>
	load({ fetch, params: { slug: 'dr-a', section }, url: new URL(href) } as never);

async function thrown(promise: unknown): Promise<{ status?: number; location?: string }> {
	try {
		await promise;
	} catch (error) {
		return error as { status?: number; location?: string };
	}
	return {};
}

describe('routes/doctors/[slug]/details/[section] load', () => {
	it('U-73.1: `details/description` redirects to the doctor’s page, asking the API nothing', async () => {
		const fetch = vi.fn();
		const answer = await thrown(
			run('description', 'http://localhost/doctors/dr-a/details/description', fetch)
		);
		expect(answer.status).toBe(308);
		expect(answer.location).toBe('/doctors/dr-a/about');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('U-73.1: the redirect keeps the page’s language', async () => {
		const answer = await thrown(
			run('description', 'http://localhost/en/doctors/dr-a/details/description')
		);
		expect(answer.status).toBe(308);
		expect(answer.location).toBe('/en/doctors/dr-a/about');
	});

	it('U-73.1 (negative): the slug is only ever a path part of this site', async () => {
		const fetch = vi.fn();
		const answer = await thrown(
			load({
				fetch,
				params: { slug: '//evil.example', section: 'description' },
				url: new URL('http://localhost/doctors/x/details/description')
			} as never)
		);
		expect(answer.location).toBe('/doctors/%2F%2Fevil.example/about');
	});

	it('an unknown section is a 404', async () => {
		const answer = await thrown(run('nothing', 'http://localhost/doctors/dr-a/details/nothing'));
		expect(answer.status).toBe(404);
	});
});

import { describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

const profile = {
	doctor: {
		doctorId: '6c1f2f7e-1b1a-4b53-9f76-0d6f3a7b2c11',
		slug: 'dr-a',
		fullName: 'Dr. A',
		images: []
	},
	pricingVisible: false
};

const backend = (status: number, data: unknown) =>
	vi.fn<(input: RequestInfo | URL) => Promise<Response>>(
		async () => new Response(JSON.stringify({ status: 'success', message: 'ok', data }), { status })
	);

const run = (fetch: typeof globalThis.fetch, href = 'http://localhost/doctors/dr-a/about') =>
	load({ fetch, params: { slug: 'dr-a' }, url: new URL(href) } as never);

async function statusOf(promise: unknown): Promise<number | undefined> {
	try {
		await promise;
	} catch (thrown) {
		return (thrown as { status?: number }).status;
	}
	return undefined;
}

describe('routes/doctors/[slug]/about load (U-73.1 Ε1)', () => {
	it('the profile’s one read, in the path’s language', async () => {
		const fetch = backend(200, profile);
		const data = (await run(fetch, 'http://localhost/en/doctors/dr-a/about')) as {
			load: { state: string; profile: { doctorSlug: string } };
		};
		expect(data.load.state).toBe('ready');
		expect(data.load.profile.doctorSlug).toBe('dr-a');
		expect(fetch).toHaveBeenCalledOnce();
		expect(String(fetch.mock.calls[0]?.[0])).toContain('lang=en');
	});

	it('a doctor nobody may see is a 404, a failed read a 503, as the profile', async () => {
		expect(await statusOf(run(backend(200, { doctor: null })))).toBe(404);
		expect(await statusOf(run(backend(500, null)))).toBe(503);
	});
});

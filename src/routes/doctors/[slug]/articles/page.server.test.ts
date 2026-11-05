import { describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

const profile = {
	doctor: {
		doctorId: '6c1f2f7e-1b1a-4b53-9f76-0d6f3a7b2c11',
		slug: 'dr-a',
		fullName: 'Dr. A',
		images: [],
		articlesSummary: { articlesCount: 6, healthAdviceCount: 3 }
	},
	pricingVisible: false
};

function backend(answer: (url: URL) => { status: number; data?: unknown; meta?: unknown }) {
	return vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async (input) => {
		const { status, data, meta } = answer(new URL(String(input)));
		return new Response(JSON.stringify({ status: 'success', message: 'ok', data, meta }), {
			status
		});
	});
}

const run = (fetch: typeof globalThis.fetch, href = 'http://localhost/doctors/dr-a/articles') =>
	load({ fetch, params: { slug: 'dr-a' }, url: new URL(href) } as never);

async function statusOf(promise: unknown): Promise<number | undefined> {
	try {
		await promise;
	} catch (thrown) {
		return (thrown as { status?: number }).status;
	}
	return undefined;
}

describe('routes/doctors/[slug]/articles load (U-77.1, U-92.3)', () => {
	it('the doctor’s first page of 12, by the id the profile names; `?type=` as the list’s', async () => {
		const fetch = backend((url) =>
			url.pathname.endsWith('/article/public/articles')
				? { status: 200, data: [], meta: { total: 0, appliedService: null } }
				: { status: 200, data: profile }
		);
		const result = (await run(
			fetch,
			'http://localhost/doctors/dr-a/articles?type=advice'
		)) as unknown as {
			scope: { doctorId: string; type: string };
			list: { state: string };
		};
		expect(result.scope).toMatchObject({
			doctorId: profile.doctor.doctorId,
			type: 'HEALTH_ADVICE'
		});
		expect(result.list.state).toBe('ready');
		const list = fetch.mock.calls
			.map(([input]) => new URL(String(input)))
			.find((url) => url.pathname.endsWith('/article/public/articles'));
		expect(list?.searchParams.get('doctorId')).toBe(profile.doctor.doctorId);
		expect(list?.searchParams.get('limit')).toBe('12');
	});

	it('U-34.3 (negative): a doctor nobody may see is the 404, and no list is asked', async () => {
		const fetch = backend((url) =>
			url.pathname.endsWith('/article/public/articles')
				? { status: 200, data: [] }
				: { status: 200, data: { doctor: null } }
		);
		expect(await statusOf(run(fetch))).toBe(404);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('a failed profile is the page’s 503', async () => {
		const fetch = backend(() => ({ status: 500 }));
		expect(await statusOf(run(fetch))).toBe(503);
	});
});

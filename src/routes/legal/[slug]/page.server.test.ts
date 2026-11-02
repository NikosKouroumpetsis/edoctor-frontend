import { describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

/** The backend, a stand-in: each request recorded; `answer` decides by the path, nothing leaves the test. */
function backend(answer: (path: string) => { status: number; data?: unknown }) {
	return vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async (input) => {
		const { status, data } = answer(new URL(String(input)).pathname);
		return new Response(JSON.stringify({ status: 'success', message: 'ok', data }), { status });
	});
}

async function statusOf(run: () => unknown): Promise<number | undefined> {
	try {
		await run();
	} catch (thrown) {
		return (thrown as { status?: number }).status;
	}
	return undefined;
}

const terms = {
	slug: 'terms-of-use',
	title: 'Όροι χρήσης',
	version: '1.0.1',
	body: { content: [] }
};
const run = (
	fetch: typeof globalThis.fetch,
	slug: string,
	href = `http://localhost/legal/${slug}`
) => load({ fetch, params: { slug }, url: new URL(href) } as never);

describe('routes/legal/[slug] load (MINOR-5 of r1: `loadContentPage` through the route)', () => {
	it('U-59.1: one CMS read of the text in the path’s language; `?edition=upcoming` asks the announced one', async () => {
		const fetch = backend(() => ({ status: 200, data: terms }));
		const result = (await run(
			fetch,
			'terms-of-use',
			'http://localhost/en/legal/terms-of-use?edition=upcoming'
		)) as { edition: string; document: { title: string } };
		expect(result.document.title).toBe('Όροι χρήσης');
		expect(result.edition).toBe('upcoming');
		const [asked] = fetch.mock.calls.map(([input]) => new URL(String(input)));
		expect(asked.pathname.endsWith('/content/public/pages/terms-of-use')).toBe(true);
		expect(asked.searchParams.get('lang')).toBe('en');
		expect(asked.searchParams.get('edition')).toBe('upcoming');
	});

	it('MINOR-2 of U-29 (negative): a slug that is no legal text is the site’s 404 — and no request leaves', async () => {
		const fetch = backend(() => ({ status: 200, data: terms }));
		for (const slug of ['faq', 'den-yparxei', '..%2Fadmin']) {
			expect(await statusOf(() => run(fetch, slug))).toBe(404);
		}
		expect(fetch).not.toHaveBeenCalled();
	});

	it('U-61.1 / U-61.2: the CMS’s 404 (or a page without a title) is the 404, another failure the 503', async () => {
		expect(
			await statusOf(() =>
				run(
					backend(() => ({ status: 404 })),
					'privacy-policy'
				)
			)
		).toBe(404);
		expect(
			await statusOf(() =>
				run(
					backend(() => ({ status: 200, data: { slug: 'x' } })),
					'privacy-policy'
				)
			)
		).toBe(404);
		expect(
			await statusOf(() =>
				run(
					backend(() => ({ status: 502 })),
					'cookies-policy'
				)
			)
		).toBe(503);
	});
});

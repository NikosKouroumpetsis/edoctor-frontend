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

const article = {
	id: 'a1',
	slug: 'aimatologikes',
	title: 'Αιματολογικές εξετάσεις',
	type: 'ARTICLE'
};
const run = (
	fetch: typeof globalThis.fetch,
	slug: string,
	href = `http://localhost/articles/${slug}`
) => load({ fetch, params: { slug }, url: new URL(href) } as never);

describe('routes/articles/[slug] load (MINOR-5 of r1: `loadArticle` through the route)', () => {
	it('U-57.4: the article and «Περισσότερα άρθρα» read together; `/en/…` asks the English copy', async () => {
		const fetch = backend((path) =>
			path.endsWith('/articles') ? { status: 200, data: [article] } : { status: 200, data: article }
		);
		const result = (await run(
			fetch,
			'Aimatologikes',
			'http://localhost/en/articles/Aimatologikes'
		)) as {
			article: { slug: string };
			related: unknown[] | null;
		};
		expect(result.article.slug).toBe('aimatologikes');
		expect(result.related).toHaveLength(1);
		const asked = fetch.mock.calls.map(([input]) => new URL(String(input)));
		expect(asked.map((url) => url.pathname.split('/').at(-1))).toEqual(
			expect.arrayContaining(['articles', 'aimatologikes'])
		);
		expect(asked.every((url) => url.searchParams.get('lang') === 'en')).toBe(true);
	});

	it('U-61.1 (negative): a slug outside the pattern is the site’s 404 — and no request leaves', async () => {
		const fetch = backend(() => ({ status: 200 }));
		for (const slug of ['../etc', 'κείμενο', 'a b', '-x', 'x'.repeat(201)]) {
			expect(await statusOf(() => run(fetch, slug))).toBe(404);
		}
		expect(fetch).not.toHaveBeenCalled();
	});

	it('U-61.1 / U-61.2: the backend’s 404 is the site’s 404, any other failure its 503 («Δοκιμάστε ξανά»)', async () => {
		expect(
			await statusOf(() =>
				run(
					backend(() => ({ status: 404 })),
					'den-yparxei'
				)
			)
		).toBe(404);
		expect(
			await statusOf(() =>
				run(
					backend(() => ({ status: 500 })),
					'aimatologikes'
				)
			)
		).toBe(503);
		expect(
			await statusOf(() =>
				run(
					backend(() => ({ status: 200, data: { slug: 'x' } })),
					'x'
				)
			)
		).toBe(404);
	});

	it('U-57.4 (negative): a failed «Περισσότερα» read leaves the article and no row — never the error page', async () => {
		const fetch = backend((path) =>
			path.endsWith('/articles') ? { status: 500 } : { status: 200, data: article }
		);
		const result = (await run(fetch, 'aimatologikes')) as { related: unknown };
		expect(result.related).toBeNull();
	});
});

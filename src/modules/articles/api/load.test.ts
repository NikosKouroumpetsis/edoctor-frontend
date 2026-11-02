import { afterEach, describe, expect, it, vi } from 'vitest';

// The feed's read: a stand-in, never the network.
const { getPublicArticles } = vi.hoisted(() => ({ getPublicArticles: vi.fn() }));
vi.mock('./feed', () => ({ getPublicArticles }));

import { HOME_ARTICLES_LIMIT, loadHomeArticles } from './load';

const serverFetch = vi.fn() as unknown as typeof fetch;

afterEach(() => getPublicArticles.mockReset());

// 🔴 U-32.9: the home's articles are a streamed promise of the route's load: it NEVER rejects.
describe('articles::api::loadHomeArticles', () => {
	it('U-32.9: a failed feed is `error` — the promise resolves, nothing goes unhandled; the usual way is the feed’s articles as before', async () => {
		const rejections: unknown[] = [];
		const record = (reason: unknown) => rejections.push(reason);
		process.on('unhandledRejection', record);
		try {
			getPublicArticles.mockRejectedValueOnce(new Error('feed down'));
			await expect(loadHomeArticles(serverFetch, 'el')).resolves.toEqual({ status: 'error' });
			const articles = [{ id: 'a1', slug: 's', title: 'Τ' }];
			getPublicArticles.mockResolvedValueOnce(articles);
			await expect(loadHomeArticles(serverFetch, 'en')).resolves.toEqual({
				status: 'ok',
				articles
			});
			await new Promise((resolve) => setTimeout(resolve, 10));
		} finally {
			process.off('unhandledRejection', record);
		}
		expect(rejections).toEqual([]);
		expect(getPublicArticles).toHaveBeenLastCalledWith(
			{ lang: 'en', limit: HOME_ARTICLES_LIMIT },
			{ fetch: serverFetch }
		);
	});
});

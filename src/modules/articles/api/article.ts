import { ApiError } from '$shared/lib/http';
import { getPublicArticle, getPublicArticles } from './feed';
import type { ArticleLoad, ArticlePublicView } from './types';

/**
 * A slug the page may ask the backend about: lowercase letters, digits and dashes, at most 200 (the backend's own
 * bound; it reads slugs lowercased). Anything else is a 404 without a request (a route parameter is untrusted input).
 */
const ARTICLE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,199}$/u;

export function isArticleSlug(slug: string): boolean {
	return ARTICLE_SLUG_PATTERN.test(slug);
}

/**
 * «Περισσότερα άρθρα» reads one page of the list (U-57.4: three are shown, the same kind first, the newest first), so
 * the article itself can be left out and there is a choice.
 */
export const RELATED_ARTICLES_READ_LIMIT = 12;

/**
 * One article on the server (wave 1.5, screen 6): the article and «Περισσότερα άρθρα» read AT ONCE through SvelteKit's
 * `fetch` (no waterfall, D-103), awaited, so the page is whole without JavaScript. It never throws: a 404 is
 * `not-found`, another failure `failed`; a failed list leaves the article and no row (`related: null`).
 */
export async function loadArticle(
	fetchImpl: typeof fetch,
	slug: string,
	lang: string
): Promise<ArticleLoad> {
	const normalized = slug.trim().toLowerCase();
	if (!isArticleSlug(normalized)) return { state: 'not-found' };
	const locale = lang === 'en' ? 'en' : 'el';
	const related = getPublicArticles(
		{ lang: locale, limit: RELATED_ARTICLES_READ_LIMIT },
		{ fetch: fetchImpl }
	)
		.then((articles): ArticlePublicView[] | null => (Array.isArray(articles) ? articles : null))
		.catch((): ArticlePublicView[] | null => null);
	try {
		const article = await getPublicArticle(normalized, locale, { fetch: fetchImpl });
		if (!article || typeof article !== 'object' || typeof article.title !== 'string')
			return { state: 'not-found' };
		return { state: 'ready', article, related: await related };
	} catch (error) {
		await related;
		if (error instanceof ApiError && error.status === 404) return { state: 'not-found' };
		return { state: 'failed' };
	}
}

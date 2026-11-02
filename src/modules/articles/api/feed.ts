import { httpGet, httpGetWithMeta } from '$shared/lib/http';
import type { ArticlePublicView, ArticleTypeDto, ArticlesFeedData } from './types';

const ARTICLES_PATH = '/article/public/articles';

/** SvelteKit's `fetch` on the server (the answer is inlined into the page), the global one in the browser. */
export type ArticlesRequestContext = { fetch?: typeof fetch; signal?: AbortSignal };

/** The list's query: the backend's strict one (`lang`, `type`, `limit`, `cursor`, and since U-57.3 `q`, `serviceId`). */
export type ArticlesQuery = {
	lang: string;
	limit: number;
	type?: ArticleTypeDto;
	cursor?: string;
	q?: string;
	serviceId?: string;
};

const paramsOf = (query: ArticlesQuery) => ({
	lang: query.lang,
	limit: query.limit,
	type: query.type,
	cursor: query.cursor,
	q: query.q,
	serviceId: query.serviceId
});

/**
 * The public, guest-readable articles feed (the application's `getPublicArticles`), already in `lang`: the articles
 * alone (the home's row). The list is ordered by slug; `cursor` is the last article's slug.
 */
export function getPublicArticles(
	query: ArticlesQuery,
	context: ArticlesRequestContext = {}
): Promise<ArticlesFeedData> {
	return httpGet<ArticlesFeedData>(ARTICLES_PATH, {
		params: paramsOf(query),
		fetch: context.fetch,
		signal: context.signal
	});
}

/** The same list with its envelope's `meta` (U-57.3: the matches' total and the applied service). */
export function getPublicArticlesWithMeta(
	query: ArticlesQuery,
	context: ArticlesRequestContext = {}
): Promise<{ data: ArticlesFeedData; meta: unknown }> {
	return httpGetWithMeta<ArticlesFeedData>(ARTICLES_PATH, {
		params: paramsOf(query),
		fetch: context.fetch,
		signal: context.signal
	});
}

/**
 * The suggestions for the words typed (U-57.3, `GET …/articles/suggestions?q=&lang=&type=`): the services and the
 * articles that match, raw (the list module adapts them).
 */
export function getArticleSuggestions(
	query: { q: string; lang: string; type?: ArticleTypeDto },
	context: ArticlesRequestContext = {}
): Promise<unknown> {
	return httpGet<unknown>(`${ARTICLES_PATH}/suggestions`, {
		params: { q: query.q, lang: query.lang, type: query.type },
		fetch: context.fetch,
		signal: context.signal
	});
}

/**
 * One published article by its slug (`GET /article/public/articles/:slug?lang=`): anonymous, the slug path-encoded so
 * no slug can break the address; an unpublished or unknown slug answers 404.
 */
export function getPublicArticle(
	slug: string,
	lang: string,
	context: ArticlesRequestContext = {}
): Promise<ArticlePublicView> {
	return httpGet<ArticlePublicView>(`${ARTICLES_PATH}/${encodeURIComponent(slug)}`, {
		params: { lang },
		fetch: context.fetch,
		signal: context.signal
	});
}

import { infiniteQueryOptions, queryOptions } from '@tanstack/svelte-query';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	getArticleSuggestions,
	getPublicArticlesWithMeta,
	type ArticlesRequestContext
} from './feed';
import type {
	ArticleAppliedService,
	ArticleSuggestedArticle,
	ArticleSuggestions,
	ArticleTypeDto,
	ArticlesFirstPageLoad,
	ArticlesListScope,
	ArticlesPage
} from './types';

/** How many articles one page of the list reads (U-57.2: 12, then «Εμφάνιση περισσότερων»). */
export const ARTICLES_PAGE_LIMIT = 12;

/** The backend's kinds, the ONE list a `?type=` of the address is checked against. */
export const ARTICLE_TYPES: readonly ArticleTypeDto[] = ['ARTICLE', 'HEALTH_ADVICE'];

/** The longest search the backend takes (its `q`: 1–100 characters, one not a space). */
export const ARTICLE_SEARCH_MAX_LENGTH = 100;

/** Whether a value of the address is one of the backend's kinds (anything else is «Όλα»). */
export function isArticleType(value: unknown): value is ArticleTypeDto {
	return typeof value === 'string' && (ARTICLE_TYPES as readonly string[]).includes(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** Whether a value of the address may be sent as `serviceId` (the backend's uuid; anything else is no filter). */
export function isServiceId(value: unknown): value is string {
	return typeof value === 'string' && UUID.test(value);
}

/** The search words of the address as the backend takes them: trimmed, at most 100 characters, `null` when empty. */
export function normalizeArticleSearch(value: string | null | undefined): string | null {
	const words = (value ?? '').trim().slice(0, ARTICLE_SEARCH_MAX_LENGTH).trim();
	return words.length > 0 ? words : null;
}

/** The list's language: the page's (`el`, `en`); anything else is Greek, the site's own. */
const langOf = (lang: string): SupportedLocale => (lang === 'en' ? 'en' : 'el');

const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

/** The list envelope's `meta` (U-57.3): the total and the applied service, each `null` when not sent. */
function readListMeta(meta: unknown): Pick<ArticlesPage, 'total' | 'appliedService'> {
	if (!meta || typeof meta !== 'object') return { total: null, appliedService: null };
	const { total, appliedService } = meta as Record<string, unknown>;
	let service: ArticleAppliedService | null = null;
	if (appliedService && typeof appliedService === 'object') {
		const { id, name } = appliedService as Record<string, unknown>;
		const serviceName = text(name);
		if (typeof id === 'string' && serviceName) service = { id, name: serviceName };
	}
	return {
		total: typeof total === 'number' && Number.isFinite(total) && total >= 0 ? total : null,
		appliedService: service
	};
}

/**
 * One page of the list: `limit` articles after `cursor` (the last one's slug, the backend's order), the next page's
 * cursor when this one came full (a full last page answers one more empty read, then the list ends), and the `meta`.
 */
export async function fetchArticlesPage(
	scope: ArticlesListScope & { cursor?: string },
	context: ArticlesRequestContext = {}
): Promise<ArticlesPage> {
	const { data, meta } = await getPublicArticlesWithMeta(
		{
			lang: langOf(scope.lang),
			limit: ARTICLES_PAGE_LIMIT,
			...(scope.type ? { type: scope.type } : {}),
			...(scope.cursor ? { cursor: scope.cursor } : {}),
			...(scope.q ? { q: scope.q } : {}),
			...(scope.serviceId ? { serviceId: scope.serviceId } : {})
		},
		context
	);
	const list = Array.isArray(data) ? data : [];
	const last = list.at(-1);
	return {
		articles: list,
		nextCursor: list.length >= ARTICLES_PAGE_LIMIT && last?.slug ? last.slug : null,
		...readListMeta(meta)
	};
}

/** The list's query keys: language, kind, words and service, so each has its own cache entry. */
export const articlesListQueryKeys = {
	all: ['articles'] as const,
	list: (scope: ArticlesListScope) =>
		[
			...articlesListQueryKeys.all,
			'list',
			langOf(scope.lang),
			scope.type ?? 'all',
			scope.q ?? '',
			scope.serviceId ?? ''
		] as const,
	suggestions: (lang: string, type: ArticleTypeDto | null, q: string) =>
		[...articlesListQueryKeys.all, 'suggestions', langOf(lang), type ?? 'all', q] as const
};

/** The list as an INFINITE (cursor) read: each page 12, the next by the page's `nextCursor` (U-57.2). */
export function articlesListInfiniteQuery(scope: ArticlesListScope) {
	return infiniteQueryOptions({
		queryKey: articlesListQueryKeys.list(scope),
		queryFn: ({ pageParam, signal }) =>
			fetchArticlesPage({ ...scope, cursor: pageParam }, { signal }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage: ArticlesPage) => lastPage.nextCursor ?? undefined
	});
}

/** The suggestions' raw answer adapted (U-57.3): unknown or partial entries left out, never a throw. */
export function mapArticleSuggestions(data: unknown): ArticleSuggestions {
	const empty: ArticleSuggestions = { services: [], articles: [] };
	if (!data || typeof data !== 'object') return empty;
	const { services, articles } = data as Record<string, unknown>;
	return {
		services: (Array.isArray(services) ? services : []).flatMap((entry) => {
			if (!entry || typeof entry !== 'object') return [];
			const { id, name, count } = entry as Record<string, unknown>;
			const serviceName = text(name);
			if (typeof id !== 'string' || !serviceName) return [];
			return [{ id, name: serviceName, count: typeof count === 'number' ? count : 0 }];
		}),
		articles: (Array.isArray(articles) ? articles : []).flatMap(
			(entry): ArticleSuggestedArticle[] => {
				if (!entry || typeof entry !== 'object') return [];
				const record = entry as Record<string, unknown>;
				const slug = text(record.slug);
				const title = text(record.title);
				if (!slug || !title) return [];
				return [
					{
						slug,
						title,
						type: isArticleType(record.type) ? record.type : null,
						imageUrl: text(record.imageUrl),
						excerpt: text(record.excerpt),
						serviceNames: Array.isArray(record.serviceNames)
							? record.serviceNames.filter(
									(name): name is string => typeof name === 'string' && name.trim().length > 0
								)
							: []
					}
				];
			}
		)
	};
}

/**
 * The suggestions for the words typed (U-57.3, Ε5 of U-57.5: from two characters, as the doctors' search): one read
 * per words, kind and language, kept a minute. A backend without the endpoint answers an error: no suggestions.
 */
export function articleSuggestionsQuery(lang: string, type: ArticleTypeDto | null, q: string) {
	return queryOptions({
		queryKey: articlesListQueryKeys.suggestions(lang, type, q),
		queryFn: async ({ signal }) =>
			mapArticleSuggestions(
				await getArticleSuggestions(
					{ q, lang: langOf(lang), ...(type ? { type } : {}) },
					{ signal }
				)
			),
		staleTime: 60_000,
		retry: false
	});
}

/**
 * The list's first page on the server (wave 1.5, screen 6): ONE read through SvelteKit's `fetch`, awaited, so the page
 * is whole without JavaScript. It never throws: a failed read is `failed` (the page offers «Δοκιμάστε ξανά»).
 */
export async function loadArticlesFirstPage(
	fetchImpl: typeof fetch,
	scope: ArticlesListScope
): Promise<ArticlesFirstPageLoad> {
	try {
		return { state: 'ready', page: await fetchArticlesPage(scope, { fetch: fetchImpl }) };
	} catch {
		return { state: 'failed' };
	}
}

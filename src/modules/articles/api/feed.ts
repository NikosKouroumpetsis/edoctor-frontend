import { httpGet } from '$shared/lib/http';
import type { ArticlesFeedData } from './types';

const ARTICLES_PATH = '/article/public/articles';

/**
 * The public, guest-readable articles feed (the application's `getPublicArticles`): newest first, already in
 * `lang`. The backend's list query is strict: only `lang` (`el | en`), `type`, `limit` and `cursor`.
 */
export function getPublicArticles(
	query: { lang: string; limit: number },
	context: { fetch?: typeof fetch; signal?: AbortSignal } = {}
): Promise<ArticlesFeedData> {
	return httpGet<ArticlesFeedData>(ARTICLES_PATH, {
		params: { lang: query.lang, limit: query.limit },
		fetch: context.fetch,
		signal: context.signal
	});
}

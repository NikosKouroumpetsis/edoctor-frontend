import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPublicArticles } from './feed';
import type { HomeArticlesFeed } from './types';

/** The articles of the home's last row: the eight newest (a row shows up to 7 from 1440, as the doctors'). */
export const HOME_ARTICLES_LIMIT = 8;

/**
 * The home's articles for the SSR `load`, as an un-awaited promise that streams into the document (the doctors'
 * pattern); it never rejects, so a failed feed shows no row and never fails the page. U-32.1: the feed's articles as
 * facts — the route builds the row's cards with `lib/article-card` `buildStreamedHomeArticles`.
 */
export function loadHomeArticles(fetchImpl: typeof fetch, lang: string): Promise<HomeArticlesFeed> {
	const locale: SupportedLocale = lang === 'en' ? 'en' : 'el';
	// U-32.9: the `catch` closes the chain — a streamed promise never rejects.
	return getPublicArticles({ lang: locale, limit: HOME_ARTICLES_LIMIT }, { fetch: fetchImpl })
		.then((articles): HomeArticlesFeed => ({ status: 'ok', articles }))
		.catch((): HomeArticlesFeed => ({ status: 'error' }));
}

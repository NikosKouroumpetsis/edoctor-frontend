import type { ResolvedPathname } from '$app/types';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { ArticlesFirstPageLoad, ArticlesListScope } from '$modules/articles/api';

/** The list's address with its kind (`?type=article|advice`), words (`?q=`) and service (`?service=`). */
export type ArticlesListHref = (state: {
	type?: string | null;
	q?: string | null;
	service?: string | null;
}) => ResolvedPathname;

/** What the list's page (wave 1.5, screen 6, U-57.2/U-57.3) needs from its route and screen. */
export type ArticlesListProps = {
	/** The server's first page (12), or its failure. */
	firstPage: ArticlesFirstPageLoad;
	/** What the address asks: the kind, the words, the service (each `null` when unused). */
	scope: ArticlesListScope;
	locale: SupportedLocale;
	listHref: ArticlesListHref;
	/** An article's address in the page's language. */
	articleHref: (slug: string) => ResolvedPathname;
	/** Below 744, the bar's «‹» (the home). */
	backHref: string;
	/** The `<head>`: the list's absolute address and its languages (the site's public origin, U-28.4). */
	canonicalUrl: string;
	alternateUrls: Record<SupportedLocale, string>;
};

/** What the list shows (U-57.2): the skeleton, the error with its retry, the empty words, or the cards. */
export type ArticlesListState = 'loading' | 'error' | 'empty' | 'ready';

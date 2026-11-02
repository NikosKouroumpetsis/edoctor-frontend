import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { SvelteURLSearchParams } from 'svelte/reactivity';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { siteUrl } from '$shared/config/site';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { ArticlesListHref } from '$modules/articles/ui/list';

const LIST_PATH = '/articles';

/** The list's address with its view (`?type=`, `?q=`, `?service=`), only the parts that are set. */
function withView(path: string, state: Parameters<ArticlesListHref>[0]): string {
	const params = new SvelteURLSearchParams();
	if (state.type) params.set('type', state.type);
	if (state.q) params.set('q', state.q);
	if (state.service) params.set('service', state.service);
	const search = params.toString();
	return `${path}${search ? `?${search}` : ''}`;
}

/**
 * The articles' list (wave 1.5, screen 6, U-57.2): the page's language and its addresses — the list's own with its
 * view (the chips, the search, the service), an article's, the home of the phone's «‹», and the `<head>`'s absolute
 * ones on the site's public origin (U-28.4, never the request's host; the kind is part of the canonical, a search is
 * not).
 */
export function useArticlesScreen(type: () => string | null) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string, language: SupportedLocale = locale) =>
		localizeHref(path, { locale: language });

	return {
		get locale() {
			return locale;
		},
		listHref: ((state) =>
			resolve(withView(localize(LIST_PATH), state) as Pathname)) satisfies ArticlesListHref,
		articleHref: (slug: string) =>
			resolve(localize(`${LIST_PATH}/${encodeURIComponent(slug)}`) as Pathname),
		get backHref() {
			return resolve(localize('/') as Pathname);
		},
		get canonicalUrl() {
			return siteUrl(withView(localize(LIST_PATH), { type: type() }));
		},
		get alternateUrls(): Record<SupportedLocale, string> {
			return {
				el: siteUrl(withView(localize(LIST_PATH, 'el'), { type: type() })),
				en: siteUrl(withView(localize(LIST_PATH, 'en'), { type: type() }))
			};
		}
	};
}

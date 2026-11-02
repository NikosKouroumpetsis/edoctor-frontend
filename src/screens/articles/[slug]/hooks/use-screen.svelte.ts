import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { replaceState } from '$app/navigation';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { ownSiteUrl, siteUrl } from '$shared/config/site';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { ArticleTypeDto } from '$modules/articles/api';
import { articleTypeParam } from '$modules/articles/lib/article-list';
import { doctorProfilePath } from '$modules/doctor/lib/detail';

/**
 * One article (wave 1.5, screen 6, U-57.4): what its page needs from the rest of the site, composed here as a module
 * never imports another — the page's language, the list and the list of its kind (the breadcrumbs), a doctor's
 * profile by its slug (the doctor module's address), the anchor written into the address, and the `<head>`'s absolute
 * addresses on the site's public origin (U-28.4). The CMS's own `canonicalUrl` is kept only on that origin over https.
 */
export function useArticleScreen(
	slug: () => string,
	type: () => ArticleTypeDto | null | undefined,
	cmsCanonical: () => string | null | undefined
) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string, language: SupportedLocale = locale) =>
		localizeHref(path, { locale: language });
	const href = (path: string) => resolve(localize(path) as Pathname);
	const articlePath = () => `/articles/${encodeURIComponent(slug())}`;

	return {
		get locale() {
			return locale;
		},
		get listHref() {
			return href('/articles');
		},
		get kindHref() {
			const kind = articleTypeParam(type() ?? null);
			return resolve(`${localize('/articles')}${kind ? `?type=${kind}` : ''}` as Pathname);
		},
		articleHref: (other: string) => href(`/articles/${encodeURIComponent(other)}`),
		doctorHref: (doctorSlug: string) => href(doctorProfilePath(doctorSlug)),
		internalHref: (path: string) => href(path),
		onAnchor: (id: string) =>
			replaceState(resolve(`${page.url.pathname}${page.url.search}#${id}` as Pathname), page.state),
		get canonicalUrl() {
			return ownSiteUrl(cmsCanonical()) ?? siteUrl(localize(articlePath()));
		},
		get alternateUrls(): Record<SupportedLocale, string> {
			return {
				el: siteUrl(localize(articlePath(), 'el')),
				en: siteUrl(localize(articlePath(), 'en'))
			};
		}
	};
}

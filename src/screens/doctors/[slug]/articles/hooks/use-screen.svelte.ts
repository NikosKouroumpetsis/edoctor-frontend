import { SvelteURLSearchParams } from 'svelte/reactivity';
import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { siteUrl } from '$shared/config/site';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { ArticlesListHref } from '$modules/articles/ui/list';
import { doctorAboutPath, doctorProfilePath } from '$modules/doctor/lib/detail';

/**
 * U-77 (the prototype 17 Π2): all the articles of one doctor: the page's language and its addresses: the page's own
 * with its kind (a chip is a link), an article's, the doctor's, and the `<head>`'s on the site's public origin.
 */
export function useDoctorArticlesScreen(slug: () => string, type: () => string | null) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string, language: SupportedLocale = locale) =>
		localizeHref(path, { locale: language });
	const pathOf = () => `${doctorProfilePath(slug())}/articles`;
	const withKind = (path: string, kind: string | null | undefined) => {
		const params = new SvelteURLSearchParams();
		if (kind) params.set('type', kind);
		const search = params.toString();
		return `${path}${search ? `?${search}` : ''}`;
	};

	return {
		get locale() {
			return locale;
		},
		listHref: ((state) =>
			resolve(withKind(localize(pathOf()), state.type) as Pathname)) satisfies ArticlesListHref,
		articleHref: (articleSlug: string) =>
			resolve(localize(`/articles/${encodeURIComponent(articleSlug)}`) as Pathname),
		get profileHref() {
			return resolve(localize(doctorProfilePath(slug())) as Pathname);
		},
		// 🔴 U-73.1 Ε1: the line of the doctor leads to the doctor's own page.
		get aboutHref() {
			return resolve(localize(doctorAboutPath(slug())) as Pathname);
		},
		get doctorsHref() {
			return resolve(localize('/doctors') as Pathname);
		},
		get canonicalUrl() {
			return siteUrl(withKind(localize(pathOf()), type()));
		},
		get alternateUrls(): Record<SupportedLocale, string> {
			return {
				el: siteUrl(withKind(localize(pathOf(), 'el'), type())),
				en: siteUrl(withKind(localize(pathOf(), 'en'), type()))
			};
		}
	};
}

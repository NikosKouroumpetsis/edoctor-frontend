import type { Pathname } from '$app/types';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { siteUrl } from '$shared/config/site';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { doctorAboutPath, doctorDetailsPath, doctorProfilePath } from '$modules/doctor/lib/detail';
import { conversationPath } from '$modules/messages/lib/paths';

/**
 * 🔴 U-73 (screen 16): the doctor's page: its language and what it needs from the rest of the site, composed here as a
 * module never imports another: the addresses on the site's public origin, the way back to the profile and its reviews.
 */
export function useDoctorAboutScreen(slug: () => string) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string, language: SupportedLocale = locale) =>
		localizeHref(path, { locale: language });
	const href = (path: string) => resolve(localize(path) as Pathname);

	return {
		get locale() {
			return locale;
		},
		get canonicalUrl() {
			return siteUrl(localize(doctorAboutPath(slug())));
		},
		get alternateUrls(): Record<SupportedLocale, string> {
			const path = doctorAboutPath(slug());
			return { el: siteUrl(localize(path, 'el')), en: siteUrl(localize(path, 'en')) };
		},
		get doctorsHref() {
			return href('/doctors');
		},
		get profileHref() {
			return href(doctorProfilePath(slug()));
		},
		get reviewsHref() {
			return href(doctorDetailsPath(slug(), 'reviews'));
		},
		onOpenReview: (focus: string) =>
			void goto(href(doctorDetailsPath(slug(), 'reviews', { focus }))),
		// 🔴 U-84.6: where «Επικοινωνήστε» leads, as on the profile.
		conversationHref: (conversationId: string) => href(conversationPath(conversationId)),
		get bookHref() {
			return href(doctorDetailsPath(slug(), 'availability'));
		},
		get focusBio() {
			return page.url.hash === '#bio';
		},
		articleHref: (articleSlug: string) => href(`/articles/${encodeURIComponent(articleSlug)}`),
		get doctorArticlesHref() {
			return href(`${doctorProfilePath(slug())}/articles`);
		}
	};
}

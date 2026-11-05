import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';

/** The favourites' page: the page's language and the addresses it links, composed here as a module never imports another. */
export function useFavoritesScreen() {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);

	return {
		get locale() {
			return locale;
		},
		profileHref: (doctorSlug: string) => href(`/doctors/${encodeURIComponent(doctorSlug)}`),
		get searchHref() {
			return href('/');
		}
	};
}

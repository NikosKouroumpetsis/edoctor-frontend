import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';

export function useHomeScreen() {
	return {};
}

/** The site's error page (U-61.1): the page's language and its paths in that language (`/help` ⇒ `/en/help`). */
export function useSiteErrorScreen() {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	return {
		get locale() {
			return locale;
		},
		href: (path: string) => resolve(localizeHref(path, { locale }) as Pathname)
	};
}

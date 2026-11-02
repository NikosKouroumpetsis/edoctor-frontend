import type { Pathname } from '$app/types';
import { invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { SvelteURLSearchParams } from 'svelte/reactivity';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { getSupportEmail } from '$shared/config/support';
import { siteUrl } from '$shared/config/site';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { HelpHref } from '$modules/help/ui/center';

const HELP_PATH = '/help';

/**
 * The help centre (wave 1.5, screen 8, U-60.1): its addresses in the page's language — the page with its search,
 * topic and anchor (`/help?topic=booking#cancellation`), the home of the phone's «‹», the support's mailbox (U-60.4)
 * and the `<head>`'s addresses on the site's public origin (without the search).
 */
export function useHelpScreen() {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string, language: SupportedLocale = locale) =>
		localizeHref(path, { locale: language });
	const href = (path: string) => resolve(localize(path) as Pathname);
	const helpHref: HelpHref = ({ q, topic, hash }) => {
		const params = new SvelteURLSearchParams();
		if (q) params.set('q', q);
		if (topic) params.set('topic', topic);
		const search = params.toString();
		return resolve(
			`${localize(HELP_PATH)}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}` as Pathname
		);
	};

	return {
		get locale() {
			return locale;
		},
		helpHref,
		get backHref() {
			return href('/');
		},
		internalHref: (path: string) => href(path),
		supportEmail: getSupportEmail(),
		onRetry: () => void invalidateAll(),
		get canonicalUrl() {
			return siteUrl(localize(HELP_PATH));
		},
		get alternateUrls(): Record<SupportedLocale, string> {
			return {
				el: siteUrl(localize(HELP_PATH, 'el')),
				en: siteUrl(localize(HELP_PATH, 'en'))
			};
		}
	};
}

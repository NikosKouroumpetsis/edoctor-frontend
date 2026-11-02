import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { m } from '$paraglide/messages.js';
import { localizeHref } from '$paraglide/runtime';
import { siteUrl } from '$shared/config/site';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { LegalDirectoryRow } from '$modules/legal/ui/directory';
import { legalSlugs } from '$modules/shell/config/legal';
import { legalIndexPath, legalPath, legalTitle } from '$modules/shell/lib/legal';

/**
 * The «Νομικά» page (wave 1.5, screen 7, U-59.3 Ε2): the shell's ONE list of legal texts (U-29 MINOR-2) and, on the
 * web, «Διαγραφή λογαριασμού», each in the page's language; the `<head>`'s addresses on the site's public origin.
 */
export function useLegalDirectoryScreen() {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string, language: SupportedLocale = locale) =>
		localizeHref(path, { locale: language });
	const href = (path: string) => resolve(localize(path) as Pathname);

	return {
		get locale() {
			return locale;
		},
		get rows(): LegalDirectoryRow[] {
			return [
				...legalSlugs.map((slug) => ({
					key: slug,
					label: legalTitle(slug, locale),
					href: href(legalPath(slug))
				})),
				{
					key: 'account-deletion',
					label: m.footer_account_deletion({}, { locale }),
					href: href('/account-deletion')
				}
			];
		},
		get backHref() {
			return href('/');
		},
		get canonicalUrl() {
			return siteUrl(localize(legalIndexPath));
		},
		get alternateUrls(): Record<SupportedLocale, string> {
			return {
				el: siteUrl(localize(legalIndexPath, 'el')),
				en: siteUrl(localize(legalIndexPath, 'en'))
			};
		}
	};
}

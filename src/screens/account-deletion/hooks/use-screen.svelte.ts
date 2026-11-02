import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { replaceState } from '$app/navigation';
import { page } from '$app/state';
import { m } from '$paraglide/messages.js';
import { localizeHref } from '$paraglide/runtime';
import { siteUrl } from '$shared/config/site';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { LinkRow } from '$shared/ui/molecules/link-rows';
import { faqAnchors } from '$modules/help/config/faq';
import { legalSlugs } from '$modules/shell/config/legal';
import { legalIndexPath, legalPath, legalTitle } from '$modules/shell/lib/legal';

/**
 * The deletion page (wave 1.5, screen 10, U-62.1): what it needs from the rest of the site, composed here as a module
 * never imports another — the home, the «Νομικά» page (U-62.2 Ε2), and «Άλλα νομικά κείμενα»: the three texts of the
 * shell's ONE list and the FAQ's «Πώς μπορώ να διαγράψω το λογαριασμό μου;» at its anchor (the FAQ is Greek only).
 */
/** The page's own path, before its language. */
const DELETION_PATH = '/account-deletion';

export function useAccountDeletionScreen() {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string, language: SupportedLocale = locale) =>
		localizeHref(path, { locale: language });
	const href = (path: string) => resolve(localize(path) as Pathname);

	return {
		get homeHref() {
			return href('/');
		},
		get legalHref() {
			return href(legalIndexPath);
		},
		get otherRows(): LinkRow[] {
			return [
				...legalSlugs.map((slug) => ({
					key: slug,
					label: legalTitle(slug, locale),
					href: href(legalPath(slug)),
					icon: 'document-text-outline' as const
				})),
				{
					key: 'faq',
					label: m.account_deletion_faq_question({}, { locale }),
					eyebrow: m.account_deletion_faq_title({}, { locale }),
					href: `${href('/help')}#${faqAnchors.deleteAccount}`,
					icon: 'help-circle-outline' as const,
					lang: locale === 'el' ? undefined : 'el'
				}
			];
		},
		get canonicalUrl() {
			return siteUrl(localize(DELETION_PATH));
		},
		get alternateUrls(): Record<SupportedLocale, string> {
			return {
				el: siteUrl(localize(DELETION_PATH, 'el')),
				en: siteUrl(localize(DELETION_PATH, 'en'))
			};
		},
		onAnchor: (id: string) =>
			replaceState(resolve(`${page.url.pathname}${page.url.search}#${id}` as Pathname), page.state)
	};
}

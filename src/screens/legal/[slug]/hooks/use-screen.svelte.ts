import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { replaceState } from '$app/navigation';
import { page } from '$app/state';
import { m } from '$paraglide/messages.js';
import { localizeHref } from '$paraglide/runtime';
import { ownSiteUrl, siteUrl } from '$shared/config/site';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { LinkRow } from '$shared/ui/molecules/link-rows';
import { legalSlugs, type LegalSlug } from '$modules/shell/config/legal';
import { legalIndexPath, legalPath, legalTitle } from '$modules/shell/lib/legal';

/**
 * A legal page (wave 1.5, screen 7, U-59.1): what it needs from the rest of the site, composed here as a module never
 * imports another — the page's language, the home and the «Νομικά» page (U-59.3 Ε2), its two editions (the announced
 * `?edition=upcoming` and the one in force), «Άλλα νομικά κείμενα» (the other two of the shell's ONE list, U-29
 * MINOR-2, and «Διαγραφή λογαριασμού», U-59.1 Π6), and the `<head>`'s addresses on the site's public origin (the CMS's
 * canonical only on that origin over https).
 */
export function useLegalScreen(slug: () => LegalSlug, cmsCanonical: () => string | null) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string, language: SupportedLocale = locale) =>
		localizeHref(path, { locale: language });
	const href = (path: string) => resolve(localize(path) as Pathname);

	return {
		get locale() {
			return locale;
		},
		get homeHref() {
			return href('/');
		},
		get legalHref() {
			return href(legalIndexPath);
		},
		get upcomingHref() {
			return `${href(legalPath(slug()))}?edition=upcoming`;
		},
		get currentHref() {
			return href(legalPath(slug()));
		},
		get otherRows(): LinkRow[] {
			return [
				...legalSlugs
					.filter((other) => other !== slug())
					.map((other) => ({
						key: other,
						label: legalTitle(other, locale),
						href: href(legalPath(other)),
						icon: 'document-text-outline' as const
					})),
				{
					key: 'account-deletion',
					label: m.footer_account_deletion({}, { locale }),
					href: href('/account-deletion'),
					icon: 'person-outline' as const
				}
			];
		},
		internalHref: (path: string) => href(path),
		onAnchor: (id: string) =>
			replaceState(resolve(`${page.url.pathname}${page.url.search}#${id}` as Pathname), page.state),
		get canonicalUrl() {
			return ownSiteUrl(cmsCanonical()) ?? siteUrl(localize(legalPath(slug())));
		},
		get alternateUrls(): Record<SupportedLocale, string> {
			return {
				el: siteUrl(localize(legalPath(slug()), 'el')),
				en: siteUrl(localize(legalPath(slug()), 'en'))
			};
		}
	};
}

import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { legalSlugs, type LegalSlug } from '$modules/shell/config/legal';

/** Whether a route's `[slug]` is one of the legal pages (any other is SvelteKit's 404). */
export const isLegalSlug = (value: string): value is LegalSlug =>
	(legalSlugs as readonly string[]).includes(value);

/** The path of a legal page, before its language (`/legal/<slug>`). */
export const legalPath = (slug: LegalSlug): `/legal/${LegalSlug}` => `/legal/${slug}`;

/** The path of the «Νομικά» page (U-59.3 Ε2), before its language. */
export const legalIndexPath = '/legal';

/** Each legal text's name in the site's words (the footer's, the consent card's, the «Νομικά» page's). */
export function legalTitle(slug: LegalSlug, locale: SupportedLocale): string {
	if (slug === 'terms-of-use') return m.footer_terms({}, { locale });
	if (slug === 'privacy-policy') return m.legal_privacy_title({}, { locale });
	if (slug === 'review-policy') return m.legal_review_policy_title({}, { locale });
	if (slug === 'doctor-marketplace-terms')
		return m.legal_document_doctor_marketplace_terms({}, { locale });
	return m.legal_cookies_title({}, { locale });
}

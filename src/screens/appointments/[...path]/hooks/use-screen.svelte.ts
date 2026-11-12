import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { buildAppointmentsLinks } from '$modules/appointments/lib/paths';
import type { AppointmentsLinks } from '$modules/appointments/types';
import type { RelativeMobileParser } from '$modules/appointments/ui/relative-form';
import { parseIdentifier } from '$modules/auth/lib/identifier';
import { doctorDetailsPath, doctorProfilePath } from '$modules/doctor/lib/detail';
import { conversationPath } from '$modules/messages/lib/paths';
import { legalPath } from '$modules/shell/lib/legal';
import type { AppointmentsScreenData } from '../types';

/**
 * 🔴 The sign-in's own rule for a mobile (the auth module's `parseIdentifier`, the booking's way): screen 52's new
 * relative's mobile is composed into E.164 exactly as the account holder's own sign-in number.
 */
const toMobilePhone: RelativeMobileParser = (dialCode, typed) => {
	const identifier = parseIdentifier(typed, dialCode);
	return identifier && 'mobilePhone' in identifier ? identifier.mobilePhone : null;
};

/**
 * Wave 4.0 · screens 50–53 (P-W4 §3.1, D-W4-20): the page the route names, its language, and every address its pages
 * lead to — in the page's language and resolved here (a module knows no route): the patient's pages (the set the
 * rating's screen shares), the doctor's profile and reviews, the review policy, a conversation, the help.
 */
export function useAppointmentsScreen(data: () => AppointmentsScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const links: AppointmentsLinks = buildAppointmentsLinks(href, doctorProfilePath);
	return {
		get locale() {
			return locale;
		},
		get address() {
			return data().address;
		},
		get links() {
			return links;
		},
		/** «Μήνυμα στον γιατρό» of a doctor already written to: their conversation (U-84.6). */
		conversationHref: (conversationId: string) => href(conversationPath(conversationId)),
		/** A doctor who takes no messages: «Κράτηση ραντεβού» on their page (the contact window's way out). */
		bookHref: (slug: string) => href(doctorDetailsPath(slug, 'availability')),
		/** U-138.5: «Δείτε τη στο προφίλ του γιατρού» — the doctor's reviews, at this one (its id, never a person's fact). */
		doctorReviewHref: (slug: string, ratingId: string) =>
			href(doctorDetailsPath(slug, 'reviews', { focus: ratingId })),
		/** «Πολιτική κριτικών» under a review that was not published. */
		get reviewPolicyHref() {
			return href(legalPath('review-policy'));
		},
		toMobilePhone
	};
}

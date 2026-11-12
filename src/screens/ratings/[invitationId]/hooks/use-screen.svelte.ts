import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { buildAppointmentsLinks } from '$modules/appointments/lib/paths';
import type { AppointmentsLinks } from '$modules/appointments/types';
import { doctorProfilePath } from '$modules/doctor/lib/detail';
import { faqAnchors } from '$modules/help/config/faq';
import { legalPath } from '$modules/shell/lib/legal';

/**
 * Wave 4.0 · screen 54 (U-138.3, P-W4 §4.5): the rating of a visit, the email's link — its invitation, the page's
 * language and every address the form and the list beside it lead to, in the page's language and resolved here (a
 * module knows no route): the patient's pages (the same set as screens 50–53), and the review's two ways on of the
 * profile's «Πώς λειτουργούν οι κριτικές» (U-67.1, U-69.2: the Help Centre's answer, the review policy).
 */
export function useRatingInvitationScreen(invitationId: () => string) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const links: AppointmentsLinks = buildAppointmentsLinks(href, doctorProfilePath);
	return {
		get locale() {
			return locale;
		},
		get invitationId() {
			return invitationId();
		},
		get links() {
			return links;
		},
		get reviewLinks() {
			return {
				helpHref: `${href('/help')}#${faqAnchors.reviews}`,
				policyHref: href(legalPath('review-policy'))
			};
		}
	};
}

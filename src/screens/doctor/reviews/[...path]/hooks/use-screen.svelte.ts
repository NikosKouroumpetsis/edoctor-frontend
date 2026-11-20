import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import {
	doctorAppointmentPath,
	doctorAppointmentsSearch,
	doctorMenuPath,
	doctorReviewsPath,
	doctorReviewsSearch,
	doctorReviewStepPath
} from '$modules/doctor-dashboard/lib/paths';
import type { DoctorReviewsLinks } from '$modules/doctor-dashboard/ui/reviews';
import type { DoctorReviewsScreenData } from '../types';

/**
 * Wave 5.2 · screen 84 «Κριτικές» (D-W52-91 / 92; `/doctor/reviews[?filter=&review=]`, `/doctor/reviews/<id>/reply|report`):
 * the page the route names, its language, and every address it leads to — in the page's language and resolved here (a
 * module knows no route): «‹» to «Μενού», each choice, the reply to a review and its report, the appointment a review
 * names (its 68 under «Ιστορικό», where a visit that was rated stands), and «Κριτικές» at the same review (where the
 * reply and the report go back to when nothing of the list lies behind them).
 */
export function useDoctorReviewsScreen(data: () => DoctorReviewsScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const address = $derived(data().address);
	const links = $derived<DoctorReviewsLinks>({
		menu: href(doctorMenuPath),
		filter: (filter) => `${href(doctorReviewsPath)}${doctorReviewsSearch({ filter })}`,
		reply: (ratingId) => href(doctorReviewStepPath(ratingId, 'reply')),
		report: (ratingId) => href(doctorReviewStepPath(ratingId, 'report')),
		appointment: (appointmentId) =>
			`${href(doctorAppointmentPath(appointmentId))}${doctorAppointmentsSearch('history', null)}`
	});
	// 🔴 D-W52-92: a reply or a report opened alone (a link, a reload) goes back to «Κριτικές» at the same review.
	const reviewsHref = $derived(
		`${href(doctorReviewsPath)}${doctorReviewsSearch({ reviewId: address.reviewId })}`
	);
	return {
		get locale() {
			return locale;
		},
		get address() {
			return address;
		},
		get links() {
			return links;
		},
		get reviewsHref() {
			return reviewsHref;
		}
	};
}

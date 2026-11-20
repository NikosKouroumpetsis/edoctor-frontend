import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorReviewsChoice } from '$modules/doctor-dashboard/lib/paths';

/** Every address the page leads to, resolved by the screen that holds it in the page's language. */
export type DoctorReviewsLinks = {
	/** «‹» below 950: the doctor's «Μενού». */
	menu: string;
	/** A choice of the list (U-218.1): «Όλες», «Χωρίς απάντηση». */
	filter: (filter: DoctorReviewsChoice) => string;
	/** 🔴 D-W52-92: the reply to one review and its report, each a page (U-102: never a window). */
	reply: (ratingId: string) => string;
	report: (ratingId: string) => string;
	/** 🔴 U-219.2: the appointment a review names (screen 68). */
	appointment: (appointmentId: string) => string;
};

/**
 * «Κριτικές» (screen 84, D-W52-91): the page's language, its choice, the review the address goes to (a notification,
 * the row of 68; `null` for none) and its addresses.
 */
export type DoctorReviewsProps = {
	locale: SupportedLocale;
	filter: DoctorReviewsChoice;
	reviewId: string | null;
	links: DoctorReviewsLinks;
};

/**
 * Where the page stands: its reads are on their way; the list could not be read; the doctor has no published review
 * (`none`); or the reviews of the choice (`ready`, maybe none of them: «Έχετε απαντήσει σε όλες.»).
 */
export type DoctorReviewsView = 'loading' | 'failed' | 'none' | 'ready';

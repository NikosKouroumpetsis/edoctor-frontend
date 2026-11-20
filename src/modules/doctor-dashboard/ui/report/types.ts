import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The report of one review (screen 84, D-W52-92): the page's language, the review's server id, where it goes back. */
export type DoctorReviewReportProps = {
	locale: SupportedLocale;
	ratingId: string;
	/** «Κριτικές», at the same review, resolved by the screen that holds the page. */
	reviewsHref: string;
};

/**
 * Where the page stands: its read is on its way; it failed; the review is no longer on the doctor's page (`gone`); it is
 * already reported and the team examines it (`reported`); or the doctor may write.
 */
export type DoctorReviewReportState = 'loading' | 'failed' | 'gone' | 'reported' | 'ready';

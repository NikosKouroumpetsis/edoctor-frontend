import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The reply to one review (screen 84, D-W52-92): the page's language, the review's server id, where it goes back. */
export type DoctorReviewReplyProps = {
	locale: SupportedLocale;
	ratingId: string;
	/** «Κριτικές», at the same review, resolved by the screen that holds the page. */
	reviewsHref: string;
};

/**
 * Where the page stands: its read is on its way; it failed; the review is no longer on the doctor's page (`gone`: no
 * longer published, or not the doctor's — D-107 tells them apart from none); or the doctor may write.
 */
export type DoctorReviewReplyState = 'loading' | 'failed' | 'gone' | 'ready';

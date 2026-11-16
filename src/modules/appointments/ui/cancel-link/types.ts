import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * 🔴 D-W51-72 · U-198.1: the cancel link's page — the page's language and the link's secret as the route read it (16
 * base64url characters; `null` for anything else, which reads «δεν ισχύει» with no request).
 */
export type AppointmentCancelLinkProps = {
	locale: SupportedLocale;
	token: string | null;
};

/**
 * What the page draws: its wait, the form, «καλέστε το ιατρείο» (the deadline passed), «δεν ισχύει» (no link, or one that
 * cancels nothing), a read refused for too many, a read that failed, and «Το ραντεβού ακυρώθηκε.».
 */
export type AppointmentCancelLinkState =
	| 'loading'
	| 'form'
	| 'late'
	| 'gone'
	| 'rate-limited'
	| 'failed'
	| 'done';

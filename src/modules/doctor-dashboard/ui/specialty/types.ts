import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** Every address the page leads to, resolved by the page that holds it in the page's language. */
export type DoctorSpecialtyLinks = {
	/** «‹» below 950: «Το προφίλ μου», the list. */
	profile: string;
	/** The row «Εξειδικεύσεις»: the page of the choice (U-102: a page, never a window). */
	specializations: string;
};

/**
 * «Ειδικότητα και εξειδικεύσεις» (screen 80, D-W52-59): the page's language and its two addresses. Its facts are the
 * browser's own reads (the session's doctor).
 */
export type DoctorSpecialtyProps = {
	locale: SupportedLocale;
	links: DoctorSpecialtyLinks;
};

/** Where the page's reads stand: on their way, one without an answer, or all answered. */
export type DoctorSpecialtyView = 'loading' | 'failed' | 'ready';

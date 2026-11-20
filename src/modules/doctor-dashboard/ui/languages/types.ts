import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** Every address the page leads to, resolved by the page that holds it in the page's language. */
export type DoctorLanguagesLinks = {
	/** «‹» below 950: «Το προφίλ μου», the list. */
	profile: string;
	/** The row «Γλώσσες που μιλάτε»: the page of the choice (U-102: a page, never a window). */
	spoken: string;
	/** The row «Κοινωνικά δίκτυα»: the page of the four links (U-102). */
	networks: string;
};

/**
 * «Γλώσσες και κοινωνικά δίκτυα» (screen 82, D-W52-69 / 70): the page's language and its three addresses. Its facts
 * are the browser's own reads (the session's doctor).
 */
export type DoctorLanguagesProps = {
	locale: SupportedLocale;
	links: DoctorLanguagesLinks;
};

/** Where the page's reads stand: on their way, one without an answer, or all answered. */
export type DoctorLanguagesView = 'loading' | 'failed' | 'ready';

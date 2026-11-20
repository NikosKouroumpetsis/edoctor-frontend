import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorCredentialKind } from '$modules/doctor-dashboard/api/credentials';

/** Every address the page leads to, resolved by the page that holds it in the page's language. */
export type DoctorCvLinks = {
	/** «‹» below 950: «Το προφίλ μου», the list. */
	profile: string;
	/** The page of ONE row (U-102: a page, never a window): the row under `id`, or a new one of the group (`null`). */
	item: (kind: DoctorCredentialKind, id: string | null) => string;
};

/**
 * «Βιογραφικό» (screen 81, D-W52-63): the page's language and its addresses. Its facts are the browser's own read (the
 * session's doctor).
 */
export type DoctorCvProps = {
	locale: SupportedLocale;
	links: DoctorCvLinks;
};

/** Where the page's read stands: on its way, without an answer, or answered. */
export type DoctorCvView = 'loading' | 'failed' | 'ready';

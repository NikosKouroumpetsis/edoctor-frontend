import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorDescriptionReader } from '$modules/doctor-dashboard/api/profile';

/** Every address the page leads to, resolved by the page that holds it in the page's language. */
export type DoctorAboutLinks = {
	/** «‹» below 950: «Το προφίλ μου», the list. */
	profile: string;
};

/**
 * «Όνομα και περιγραφή» (screen 79, read only): the page's language, its address back, and the public page's own reader
 * of a description — handed in by the screen (a module never imports another). Its facts are the browser's own reads.
 */
export type DoctorAboutProps = {
	locale: SupportedLocale;
	links: DoctorAboutLinks;
	readDescription: DoctorDescriptionReader;
};

/** Where the page's read stands: on its way, without an answer, or answered. */
export type DoctorAboutView = 'loading' | 'failed' | 'ready';

import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** Every address the page leads to, resolved by the page that holds it in the page's language. */
export type DoctorServicesLinks = {
	/** «‹» below 950: «Το προφίλ μου», the list. */
	profile: string;
	/** The page of ONE service (U-102: a page, never a window). */
	service: (id: string) => string;
	/** «Προσθήκη υπηρεσίας»: «Νέα υπηρεσία», the catalogue of the specialty. */
	catalogue: string;
};

/** «Υπηρεσίες και τιμές» (screen 83, D-W52-81): the page's language and its addresses. */
export type DoctorServicesProps = {
	locale: SupportedLocale;
	links: DoctorServicesLinks;
};

/** Where the page's read stands: on its way, without an answer, or answered. */
export type DoctorServicesView = 'loading' | 'failed' | 'ready';

/** One row of the list: the server's id, the title, «30′ · 60 €». */
export type DoctorServiceRow = { id: string; title: string; line: string };

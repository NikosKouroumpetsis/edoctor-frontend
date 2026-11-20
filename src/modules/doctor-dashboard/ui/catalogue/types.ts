import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * «Νέα υπηρεσία» (screen 83, D-W52-81): the page's language, where «‹» leads (screen 83) and the page of a new service
 * of the catalogue — each resolved by the page that holds it in the page's language.
 */
export type DoctorServiceCatalogueProps = {
	locale: SupportedLocale;
	servicesHref: string;
	item: (serviceId: string) => string;
	onClose: () => void;
};

/** Where the page's read stands: on its way, without an answer, or answered. */
export type DoctorServiceCatalogueView = 'loading' | 'failed' | 'ready';

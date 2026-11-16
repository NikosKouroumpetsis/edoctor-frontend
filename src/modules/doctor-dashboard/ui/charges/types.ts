import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * «Υπηρεσίες και κόστος»'s one address, in the page's language and resolved by the screen (a module knows no route):
 * screen 68 of the same appointment, with the list's pill and office — «‹», «Άκυρο» and a save lead there (D-W51-52).
 */
export type DoctorChargesLinks = { appointment: string };

/** Screen 70 «Υπηρεσίες και κόστος» (D-W51-52): the page's language, the appointment the address names, where it leads. */
export type DoctorChargesProps = {
	locale: SupportedLocale;
	appointmentId: string;
	links: DoctorChargesLinks;
};

/** What the page draws: its wait, the form, «δεν γίνεται πια», one not found (D-W51-06), a failed read. */
export type DoctorChargesState = 'loading' | 'form' | 'closed' | 'missing' | 'failed';

/** The doctor's services' own read under the form: its wait, a read that failed, the rows. */
export type DoctorServicesState = 'loading' | 'failed' | 'ready';

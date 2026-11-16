import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * Screen 70's one address, in the page's language and resolved by the screen (a module knows no route): screen 68 of
 * the same appointment, with the list's pill and office — «‹», «Άκυρο» and a save lead there (D-W51-51).
 */
export type DoctorMoveLinks = { appointment: string };

/** Screen 70 «Αλλαγή ώρας» (D-W51-51): the page's language, the appointment the address names, where it leads. */
export type DoctorMoveProps = {
	locale: SupportedLocale;
	appointmentId: string;
	links: DoctorMoveLinks;
};

/** What the page draws: its wait, the form, «δεν γίνεται πια», one not found (D-W51-06), a failed read. */
export type DoctorMoveState = 'loading' | 'form' | 'closed' | 'missing' | 'failed';

/** The hours' own read under the form: its wait, a read that failed, the days. */
export type DoctorMoveSlotsState = 'loading' | 'failed' | 'ready';

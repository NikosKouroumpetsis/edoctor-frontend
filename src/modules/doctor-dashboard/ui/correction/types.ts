import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * Screen 71's one address, in the page's language and resolved by the screen (a module knows no route): screen 68 of
 * the same appointment, with the list's pill and office — «‹», «Άκυρο» and a save lead there (D-W51-62).
 */
export type DoctorCorrectionLinks = { appointment: string };

/** Screen 71 «Διόρθωση έκβασης» (D-W51-62): the page's language, the appointment the address names, where it leads. */
export type DoctorCorrectionProps = {
	locale: SupportedLocale;
	appointmentId: string;
	links: DoctorCorrectionLinks;
};

/** What the page draws: its wait, the form, «δεν γίνεται πια» (D-W51-62), one not found (D-W51-06), a failed read. */
export type DoctorCorrectionState = 'loading' | 'form' | 'closed' | 'missing' | 'failed';

/** Why the page says «δεν γίνεται πια»: the review the patient wrote (U-196.1), or anything else that refused it. */
export type DoctorCorrectionRefusal = 'rated' | 'closed';

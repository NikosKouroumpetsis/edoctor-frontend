import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorReasonStep } from '$modules/doctor-dashboard/lib/paths';

/**
 * Screen 69's addresses, in the page's language and resolved by the screen (a module knows no route): screen 68 of the
 * same appointment, with the list's pill and office — «‹», «Να μείνει» and the done action lead there (D-W51-46) — and
 * its «Αλλαγή ώρας» (screen 70, D-W51-47 / 51: «Θέλετε απλώς άλλη ώρα;»).
 */
export type DoctorReasonLinks = { appointment: string; time: string };

/** Screen 69 (D-W51-46 … 48): the page's language, the appointment the address names, which step, where it leads. */
export type DoctorReasonProps = {
	locale: SupportedLocale;
	appointmentId: string;
	step: DoctorReasonStep;
	links: DoctorReasonLinks;
};

/** What the page draws: its wait, the form, «δεν γίνεται πια» (D-W51-48), one not found (D-W51-06), a failed read. */
export type DoctorReasonState = 'loading' | 'form' | 'closed' | 'missing' | 'failed';

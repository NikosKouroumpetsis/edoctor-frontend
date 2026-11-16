import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorNewAppointmentOrigin,
	DoctorNewAppointmentPatientKey
} from '$modules/doctor-dashboard/lib/paths';

/**
 * Screen 72's addresses, in the page's language and resolved by the screen (a module knows no route): where «‹» and
 * «Άκυρο» lead when it was not opened as a step (the list with its pill and office, or «Σήμερα»), and the 68 of the new
 * appointment once booked (D-W51-70: «Το ραντεβού κλείστηκε.»).
 */
export type DoctorNewLinks = {
	back: string;
	appointment: (appointmentId: string) => string;
};

/**
 * Screen 72 «Νέο ραντεβού» (D-W51-69 / 70): the page's language, where it was opened from (`today`: alone in the middle;
 * `list`: beside «Ραντεβού» from 1128), the patient the address names (`?kind=&id=`), where it leads.
 */
export type DoctorNewProps = {
	locale: SupportedLocale;
	from: DoctorNewAppointmentOrigin;
	patient: DoctorNewAppointmentPatientKey | null;
	links: DoctorNewLinks;
};

/** What the page draws: its wait, the form, a read that failed, nothing to book with (no office or no service). */
export type DoctorNewState = 'loading' | 'form' | 'failed' | 'empty';

/** «Ασθενής»: the search, «Νέος ασθενής», or the one chosen (a card with «Αλλαγή»). */
export type DoctorNewPatientStep = 'search' | 'new' | 'picked';

/** A read under the form (the search, the hours): its wait, a failure, its answer. */
export type DoctorNewReadState = 'loading' | 'failed' | 'ready';

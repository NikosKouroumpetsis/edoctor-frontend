import type { Snippet } from 'svelte';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorAppointmentsAddress,
	DoctorAppointmentStep,
	DoctorAppointmentsTab
} from '$modules/doctor-dashboard/lib/paths';

/**
 * Every address screen 67 leads to, in the page's language and resolved by the screen (a module knows no route):
 * «‹» back to «Σήμερα», the list with a pill and an office (`?tab=…&office=…`), one appointment (screen 68, D-W51-36)
 * and what it opens (screen 69, D-W51-49: a request's «Απόρριψη»; screen 70, D-W51-51: its «Αλλαγή»), with the same
 * pill and office; «+» (screen 72, D-W51-69) beside the list with its pill and office.
 */
export type DoctorAppointmentsLinks = {
	today: string;
	newAppointment: (tab: DoctorAppointmentsTab, officeId: string | null) => string;
	list: (tab: DoctorAppointmentsTab, officeId: string | null) => string;
	appointment: (
		appointmentId: string,
		tab: DoctorAppointmentsTab,
		officeId: string | null
	) => string;
	step: (
		appointmentId: string,
		step: DoctorAppointmentStep,
		tab: DoctorAppointmentsTab,
		officeId: string | null
	) => string;
};

/**
 * Screen 67 «Ραντεβού» (D-W51-29, D-W51-31, D-W51-36): the page's language, what the address shows and where it leads;
 * from 1128 the appointment the address names stands beside the list (`pane`, composed by the screen), below it in
 * place of the list.
 */
export type DoctorAppointmentsProps = {
	locale: SupportedLocale;
	address: DoctorAppointmentsAddress;
	links: DoctorAppointmentsLinks;
	/** Screen 68, composed by the screen (a slice never draws another); `opening`: the first is about to open. */
	pane?: Snippet<[{ opening: boolean }]>;
};

/** What a pill draws: its wait, a read that failed, its empty words, or its cards. */
export type DoctorAppointmentsView = 'loading' | 'failed' | 'empty' | 'ready';

/** One of the doctor's offices as the filter names it: its id and its street in the page's language. */
export type DoctorOfficeChoice = { id: string; label: string };

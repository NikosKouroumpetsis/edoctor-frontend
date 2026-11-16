import type { Snippet } from 'svelte';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorPatientAddressKey,
	DoctorPatientsAddress
} from '$modules/doctor-dashboard/lib/paths';

/**
 * Every address screen 73's list leads to, in the page's language and resolved by the screen (a module knows no
 * route): «‹» back to «Μενού» (below 744), one patient's card, and the empty list's «Νέο ραντεβού» (screen 72).
 */
export type DoctorPatientsLinks = {
	menu: string;
	card: (key: DoctorPatientAddressKey) => string;
	newAppointment: string;
};

/**
 * Screen 73 «Οι ασθενείς μου» (D-W51-73, D-W51-74): the page's language, what the address shows and where it leads; from
 * 1128 the card the address names stands beside the list (`pane`, composed by the screen), below it in its place.
 */
export type DoctorPatientsProps = {
	locale: SupportedLocale;
	address: DoctorPatientsAddress;
	links: DoctorPatientsLinks;
	/** The card (and what it opens), composed by the screen (a slice never draws another). */
	pane?: Snippet;
};

/** What the list draws: its wait, a read that failed, no patient yet, a search that found nobody, its rows. */
export type DoctorPatientsView = 'loading' | 'failed' | 'empty' | 'none' | 'ready';

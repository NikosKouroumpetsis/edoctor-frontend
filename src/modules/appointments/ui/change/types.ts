import type { Snippet } from 'svelte';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AppointmentDetailFacts } from '$modules/appointments/api/appointment';
import type { AppointmentChangeStep } from '$modules/appointments/lib/change';
import type { AppointmentDoctorFacts, AppointmentsLinks } from '$modules/appointments/types';
import type { RelativeMobileParser } from '$modules/appointments/ui/relative-form';

/**
 * Screen 52 «Αλλαγή ραντεβού» (record §8, U-136; P-W4 §4.3): what each of its screens reads — the appointment as its page
 * read it (with `actions`), its doctor (the screen's read, D-W4-29: `undefined` while read), the addresses.
 */
export type AppointmentChangeProps = {
	locale: SupportedLocale;
	appointment: AppointmentDetailFacts;
	doctor: AppointmentDoctorFacts | null | undefined;
	links: AppointmentsLinks;
};

/** «Αλλαγή ώρας»: the hours are the doctor module's picker, composed by the screen on the appointment's one office. */
export type AppointmentTimeChangeProps = AppointmentChangeProps & {
	/** The hour chosen in the picker (its instant, offered in the window read), `null` for none. */
	picked: string | null;
	picker: Snippet;
	/** «Άλλη ώρα» (U-136.4): the choice goes, nothing is written. */
	onRepick: () => void;
	/** The server said the hour is taken (record §8.2): it leaves the grid and the hours are read again. */
	onGone: (startTime: string) => void;
};

/** «Προσθήκη συγγενή»: a mobile is read by the sign-in's rule (the auth module's, composed by the screen). */
export type AppointmentRelativeAddProps = AppointmentChangeProps & {
	toMobilePhone: RelativeMobileParser;
};

/** The slice's entry (`page/index.svelte`): the screen of 52 its address names, with what each of them takes. */
export type AppointmentChangeScreenProps = AppointmentTimeChangeProps &
	AppointmentRelativeAddProps & { step: AppointmentChangeStep };

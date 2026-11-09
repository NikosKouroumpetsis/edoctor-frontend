import type { Snippet } from 'svelte';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { BookingSlotChoice } from '$modules/appointments/lib/booking';
import type { BookingAvailabilityFacts, BookingDoctorFacts } from '$modules/appointments/types';

/** Where the slots of the chosen office stand (the doctor module's read, through the screen). */
export type BookingSlotsState = 'idle' | 'waiting' | 'failed' | 'answered';

/** What every booking screen needs from the rest of the site, composed by its screen (a module imports no other). */
export type BookingScreenContext = {
	slug: string;
	locale: SupportedLocale;
	/** A path of the site, in the page's language and resolved (`localizeHref` + `resolve`). */
	href: (path: string) => string;
	/**
	 * The doctor's page with the hour (a link, record §3.2: «×» keeps it): where screen 30 closes, where screen 31 leads
	 * (U-103.1), and where a «Αλλαγή» with no hour behind it goes back (review w3-w2 R1 MINOR-2).
	 */
	profileHref: string;
};

/** Screen 30 (record §3.2–§3.4): the doctor and the chosen office's window for the chosen service. */
export type BookingReviewProps = BookingScreenContext & {
	doctor: BookingDoctorFacts;
	/** The service the slots are read for: the draft's, else the doctor's default (the screen resolves it). */
	serviceId: string | undefined;
	availability: BookingAvailabilityFacts | undefined;
	availabilityState: BookingSlotsState;
	/** «Συνδεθείτε για κόστος»: a guest signs in; a member whose prices did not come asks for them again (R-6). */
	onFeeSignIn: () => void;
	/** The slots again: a refusal said the hour is gone, or their read failed. */
	onRetrySlots: () => void;
};

/** «Διαθεσιμότητα» (record §3.3): the picker is the doctor module's (the screen composes it). */
export type BookingTimeProps = BookingScreenContext & {
	title: string;
	/** The hour chosen on this screen, not yet saved. */
	staged: BookingSlotChoice | null;
	/** Whether that hour is offered in the window read («Αποθήκευση» locks otherwise). */
	canSave: boolean;
	serviceId: string | undefined;
	picker: Snippet;
};

/** The frame of every «Αλλαγή» screen (record §3.3): «←», the title, the content, «Άκυρο» and «Αποθήκευση». */
export type BookingChangeFrameProps = {
	title: string;
	subtitle?: string;
	backHref: string;
	onBack: (event: MouseEvent) => void;
	saveLabel?: string;
	saveDisabled?: boolean;
	saveLoading?: boolean;
	onCancel: () => void;
	onSave: () => void;
	locale: SupportedLocale;
	testId?: string;
	children?: Snippet;
};

/**
 * The sign-in's own rule for a mobile (the auth module's, composed by the screen: a module imports no other): what was
 * typed, with its country, as the E.164 number the server takes, or `null` for one it would refuse.
 */
export type BookingMobileParser = (dialCode: string, typed: string) => string | null;

/** Every «Αλλαγή» screen of part 2 (record §3.3): the screen's context and the service screen 30 books (resolved). */
export type BookingChangeProps = BookingScreenContext & { serviceId: string | undefined };

/** «Επιλέξτε υπηρεσία»: the doctor's services, with the fees a member may see (U-34.4). */
export type BookingServiceProps = BookingChangeProps & { doctor: BookingDoctorFacts };

/** «Νέος συγγενής» and «Το κινητό σας»: a mobile is read by the sign-in's rule. */
export type BookingMobileProps = BookingChangeProps & { toMobilePhone: BookingMobileParser };

/** Screen 31 (record §4): the doctor, the appointment the address names, and the way back to the doctor (U-103.1). */
export type BookingSuccessProps = BookingScreenContext & {
	doctor: BookingDoctorFacts;
	appointmentId: string;
};

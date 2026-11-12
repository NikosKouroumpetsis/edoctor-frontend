import type { Snippet } from 'svelte';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { BookingRelativeFacts } from '$modules/appointments/api/patient';
import type { RelativeFacts } from '$modules/appointments/api/relatives';
import type { RelativePhoneSplitter } from '$modules/appointments/lib/relatives';
import type { ChangeFramePlacement } from '$modules/appointments/ui/change-screen';

/**
 * The sign-in's own rule for a mobile (the auth module's, composed by the screen: a module imports no other): what was
 * typed, with its country, as the E.164 number the server takes, or `null` for one it would refuse.
 */
export type RelativeMobileParser = (dialCode: string, typed: string) => string | null;

/**
 * «Νέος συγγενής» (record §3.3, §8.2; P-W4 Σ-27): ONE form of the relatives, opened by the booking's «Για ποιον…», by
 * screen 52's «Προσθήκη συγγενή» and by screen 55 — new, or «Επεξεργασία συγγενή» on one `relative` on file. Each caller
 * says where «←» / «Άκυρο» lead and what follows a save.
 */
export type RelativeFormProps = {
	locale: SupportedLocale;
	toMobilePhone: RelativeMobileParser;
	/** «←»'s own address (a link: a new tab still opens it). */
	backHref: string;
	onBack: (event: MouseEvent) => void;
	onCancel: () => void;
	/** The relative the server made, or (screen 55) the one it changed: the caller goes on with it. */
	onSaved: (relative: BookingRelativeFacts) => void;
	placement?: ChangeFramePlacement;
	/** The screen's test id, and each field's prefix (`booking-relative` by default). */
	testId?: string;
	/**
	 * Screen 55: the relative on file whose form this is («Επεξεργασία συγγενή»: its values first, «Αποθήκευση» asleep
	 * until something changes, only what changed sent); none for a new one.
	 */
	relative?: RelativeFacts | null;
	/** The sign-in's own reading of a stored mobile's country (the auth module's, composed by the screen). */
	splitMobilePhone?: RelativePhoneSplitter;
	/** Screen 55: the relative is not the person's any more (a `403` / `404` on the change): the caller takes the list. */
	onGone?: () => void;
	/** From 950 the list of relatives beside the form (screen 55): «←» hides there. */
	besideList?: boolean;
	/** The end of the screen, after its bar (screen 55's «Διαγραφή συγγενή»). */
	footer?: Snippet;
};

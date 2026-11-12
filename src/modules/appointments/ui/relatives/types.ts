import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { RelativePhoneSplitter } from '$modules/appointments/lib/relatives';
import type { AppointmentsViewer } from '$modules/appointments/types';
import type { RelativeMobileParser } from '$modules/appointments/ui/relative-form';
import type { RelativeUpcoming } from './hooks/use-upcoming.svelte';

/** What the address opens (D-W4-20): the list, «Νέος συγγενής», or one relative's form. */
export type RelativesAddress =
	| { view: 'list' }
	| { view: 'new' }
	| { view: 'edit'; relativeId: string };

/** Every address the pages lead to, resolved by the screen in the page's language (a module knows no route). */
export type RelativesLinks = {
	/** «←» of the list: the «Προφίλ» tab. */
	profile: string;
	list: string;
	create: string;
	relative: (relativeId: string) => string;
};

/** What the list shows (record §11.2): a guest's, a failure, its wait, a person without a patient, none yet, the rows. */
export type RelativesListView = 'guest' | 'failed' | 'loading' | 'blocked' | 'empty' | 'rows';

export type RelativesPageProps = {
	locale: SupportedLocale;
	address: RelativesAddress;
	links: RelativesLinks;
	viewer: AppointmentsViewer;
	offline: boolean;
	toMobilePhone: RelativeMobileParser;
	splitMobilePhone: RelativePhoneSplitter;
	/** The deletion window's read of the upcoming visits (the screen names their doctor). */
	upcoming: RelativeUpcoming;
	/** A doctor's name as the profile gives it, `null` / `undefined` while read or for nobody (D-W4-29). */
	doctorNameOf: (doctorId: string) => string | null | undefined;
	onSignIn: () => void;
	onRetrySession: () => void;
};

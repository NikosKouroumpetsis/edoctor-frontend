import type { Snippet } from 'svelte';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AppointmentDone } from '$modules/appointments/lib/detail';
import type {
	AppointmentDoctorFacts,
	AppointmentsLinks,
	AppointmentsViewer
} from '$modules/appointments/types';
import type { AppointmentDetailRead } from './hooks/use-detail.svelte';

/** Screen 51 (record §7, U-135; P-W4 §4.2): one appointment of the person, its states, and what it leads to. */
export type AppointmentDetailProps = {
	locale: SupportedLocale;
	viewer: AppointmentsViewer;
	read: AppointmentDetailRead;
	/** The appointment's doctor (the screen's read, D-W4-29): `undefined` while it is read, `null` for nobody to show. */
	doctor: AppointmentDoctorFacts | null | undefined;
	links: AppointmentsLinks;
	/** The browser has no network: with nothing read yet, the appointment says it failed. */
	offline: boolean;
	/** D-W4-33: what was just saved on it (the page's memory), said in green on top (U-136.6). */
	done: AppointmentDone | null;
	/** The patient canceled it just now (its «Σας στείλαμε email επιβεβαίωσης.», D-W4-11). */
	justCanceled: boolean;
	/** «Μήνυμα στον γιατρό»: the messages' flow, composed by the screen (`null` until the doctor is known). */
	message: { press: () => void; busy: boolean } | null;
	onSignIn: () => void;
	/** The session's read failed: the screen asks it again. */
	onRetrySession: () => void;
	/** «Η κριτική σας» (screen 54's card on the 51, U-138.5): composed in its place when the visit has one. */
	review?: Snippet;
};

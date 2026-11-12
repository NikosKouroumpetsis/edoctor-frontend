import type { Snippet } from 'svelte';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AppointmentsTab } from '$modules/appointments/lib/paths';
import type {
	AppointmentDoctorFacts,
	AppointmentsLinks,
	AppointmentsViewer
} from '$modules/appointments/types';
import type { AppointmentsList } from './hooks/use-list.svelte';

/** What the list's column shows: the guest's words, its wait, its failure, an empty tab, or the cards. */
export type AppointmentsListView = 'guest' | 'loading' | 'failed' | 'empty' | 'rows';

/** Screen 50's page (P-W4 §4.1): the list on the left, what it opened on the right (the screen's `pane`). */
export type AppointmentsListPageProps = {
	locale: SupportedLocale;
	/** The tab on screen: the address's on the list, the appointment's own on an appointment (P-W4 §3.2). */
	tab: AppointmentsTab;
	list: AppointmentsList;
	viewer: AppointmentsViewer;
	/** The browser has no network (`online`): with nothing read yet, the list says it failed. */
	offline: boolean;
	/** The appointment open on the right (its address), `null` on the list itself. */
	openId: string | null;
	/**
	 * Something stands on the right whatever `openId` says (screen 54's form, `/ratings/<id>`, before its invitation
	 * names the visit); by default an appointment's address.
	 */
	open?: boolean;
	/**
	 * From 950 the list's first appointment opens by itself on the list's own address (P-W4 §3.2); `false` on a page
	 * whose right column is its own (screen 54), which a list must never navigate away from.
	 */
	autoOpen?: boolean;
	/** Changes whenever the right column shows another thing: it starts again at its top (`appt.js:525`). */
	paneKey: string | null;
	/**
	 * 🔴 U-139.1: the right column has nothing to show (its appointment failed or was not found — never while it is read:
	 * its wait is something); with the list's own wait, failure or empty tab beside it the page is ONE column (review
	 * w4-w4 R1 MINOR-2).
	 */
	paneEmpty?: boolean;
	doctorOf: (doctorId: string) => AppointmentDoctorFacts | null | undefined;
	links: AppointmentsLinks;
	onSignIn: () => void;
	/** The session's read failed: it is asked again; else the list. */
	onRetry: () => void;
	/**
	 * The right column: the appointment and the screens it opens (the screen composes them). `opening`: from 950 the
	 * list's first is about to open there (its wait, review w4-w4 R1 MINOR-1).
	 */
	pane: Snippet<[{ opening: boolean }]>;
};

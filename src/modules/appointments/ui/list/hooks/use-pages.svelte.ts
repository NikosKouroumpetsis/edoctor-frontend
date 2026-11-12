import { onDestroy, untrack } from 'svelte';
import { MediaQuery } from 'svelte/reactivity';
import { online } from 'svelte/reactivity/window';
import { afterNavigate } from '$app/navigation';
import { breakpoints } from '$shared/design/tokens';
import { readServerNow } from '$shared/lib/server-clock';
import { getSessionOptional } from '$shared/state/session';
import type { AppointmentDetailFacts } from '$modules/appointments/api/appointment';
import { appointmentTabOf } from '$modules/appointments/lib/detail';
import { appointmentsViewerOf, joinAppointmentDoctorIds } from '$modules/appointments/lib/list';
import type {
	AppointmentsAddress,
	AppointmentStep,
	AppointmentsTab
} from '$modules/appointments/lib/paths';
import { useAppointmentDetail } from '$modules/appointments/ui/detail';
import {
	getAppointmentsMemoryOptional,
	useAppointmentsMemory,
	useKeptThroughExpiry,
	type AppointmentsMemory
} from '$modules/appointments/ui/memory';
import { useRatingInvitation, type RatingInvitationRead } from '$modules/appointments/ui/rating';
import { useAppointmentsList } from './use-list.svelte';

/**
 * What stands beside the list: the address of `/appointments/**` (screens 50–53: the list's own, or an appointment and
 * the screen it opened), or the invitation of `/ratings/<id>` (screen 54: the form, its visit selected in the list).
 */
export type AppointmentsPagesSource =
	| { page: 'appointments'; address: () => AppointmentsAddress }
	| { page: 'rating'; invitationId: () => string };

/**
 * Wave 4.0 · the patient's pages under the list (screens 50–54; review w4-arch-frontend L-1: the feature's rules in the
 * module, the screens compose). ONE home for what the two screens share and for what each decides:
 * - who reads (U-80.1 Ε6: the page's server knows nobody — the wait, then the browser fills it in), whether the account
 *   has a patient's appointments at all, whether the browser is online;
 * - the list's tab (P-W4 §3.2): the address's on the list; beside an appointment or a visit, that one's own (closed, or
 *   begun ⇒ «Ιστορικό»), never the address's — until it is read, the tab last shown (U-137.6: after a cancellation the
 *   list moves by itself), «Ιστορικό» beside the rating's form;
 * - when the list is read (P-W4 §3.6, D-103: nothing read for nobody to see, nor the wrong tab first): on its own
 *   address, and from 950 beside an appointment once that one has told its tab — once shown it stays, its cards, its
 *   scroll, its focus (review w4-w4 R1 MAJOR-1) — or beside the form while the visit is read; until then its wait;
 * - 🔴 U-139.1 `paneEmpty`: the right column has nothing to show once what it reads failed, was refused or was not
 *   found; while it is READ it shows its wait, which is something;
 * - 🔴 D-W4-33 the page's memory: said on its own appointment only, gone once another opens or the pages are left;
 *   U-153: back on the appointment with a notice just written, its page starts at the top — once per write;
 * - U-138.3: the email's link may reach a guest — the sign-in opens over the form once;
 * - 🔴 D-W4-78 (U-84) `opened`: a session that ended on a write of screens 52 / 53 (`expire`) takes the personal reads,
 *   not the form — the appointment it stands on is kept under the sign-in and for the same person after it
 *   (`useKeptThroughExpiry`, where the rule and its limits live); a guest, a sign-out, a sign-in left or another account
 *   reads the 51's own states.
 */
export function useAppointmentsPages<Source extends AppointmentsPagesSource>(source: Source) {
	const session = getSessionOptional();
	const viewer = $derived(appointmentsViewerOf(session));
	const isMember = $derived(viewer === 'member');
	// An account the server knows no patient for (a doctor's) has no appointments of a patient to read: the empty list.
	const isPatient = $derived(session?.member?.hasPatientProfile !== false);
	const offline = $derived(online.current === false);
	const wide = new MediaQuery(`(min-width: ${breakpoints.split}px)`, false);

	const address = $derived(source.page === 'appointments' ? source.address() : null);
	const invitation =
		source.page === 'rating'
			? useRatingInvitation({ invitationId: source.invitationId, enabled: () => isMember })
			: null;
	// The appointment on the right: the address's own, or the visit the invitation names (none until it is read).
	const openId = $derived(
		address
			? address.view === 'appointment'
				? address.appointmentId
				: null
			: (invitation?.invitation?.appointmentId ?? null)
	);
	const visit = useAppointmentDetail({ appointmentId: () => openId, enabled: () => isMember });
	const step = $derived<AppointmentStep | null>(
		address?.view === 'appointment' ? address.step : null
	);
	const kept = useKeptThroughExpiry<AppointmentDetailFacts>({
		key: () => openId,
		live: () => (isMember ? visit.appointment : null),
		gone: () => visit.missing
	});
	const opened = $derived(kept.current);
	const paneKey = $derived(
		source.page === 'rating'
			? source.invitationId()
			: address?.view === 'appointment'
				? `${address.appointmentId}/${address.step ?? ''}`
				: null
	);

	const listTab = $derived(address?.view === 'list' ? address.tab : null);
	let lastTab = $state<AppointmentsTab>(
		untrack(() => (source.page === 'rating' ? 'history' : (listTab ?? 'upcoming')))
	);
	const tab = $derived.by((): AppointmentsTab => {
		if (listTab) return listTab;
		return visit.appointment ? appointmentTabOf(visit.appointment, readServerNow()) : lastTab;
	});
	if (source.page === 'appointments') {
		$effect(() => {
			const shown = tab;
			untrack(() => (lastTab = shown));
		});
	}

	let listSeen = $state(untrack(() => listTab !== null));
	const beside = $derived(
		source.page === 'rating'
			? visit.appointment !== null
			: listSeen || visit.appointment !== null || visit.missing || visit.failed
	);
	const listShown = $derived(listTab !== null || (wide.current && beside));
	if (source.page === 'appointments') {
		$effect(() => {
			if (listShown) untrack(() => (listSeen = true));
		});
	}
	const listRead = $derived(isMember && isPatient);
	const list = useAppointmentsList({
		tab: () => tab,
		enabled: () => listRead && listShown,
		waiting: () => listRead && wide.current && !listShown
	});

	// D-W4-29: one public profile per different doctor of the loaded pages and of the appointment on the right.
	const doctorIds = $derived(joinAppointmentDoctorIds(list.doctorIds, visit.appointment?.doctorId));

	const paneEmpty = $derived.by(() => {
		if (!isMember) return false;
		if (invitation) {
			return (
				invitation.refused ||
				invitation.failed ||
				visit.missing ||
				visit.failed ||
				(offline && (invitation.invitation === null || visit.appointment === null))
			);
		}
		return openId !== null && opened === null && (visit.failed || visit.missing || offline);
	});

	let memory: AppointmentsMemory | null = null;
	if (source.page === 'appointments') {
		const kept = getAppointmentsMemoryOptional() ?? useAppointmentsMemory();
		memory = kept;
		$effect(() => {
			const id = openId;
			untrack(() => kept.keepOnly(id));
		});
		onDestroy(() => kept.keepOnly(null));
		// 🔴 U-153 (card w4-w12; live check w4-live-web-3 Δ1): a save leaves its screen through the history, and the router
		// puts the appointment's old scroll back — the notice out of sight on a phone. `afterNavigate` runs AFTER that
		// (`@sveltejs/kit` `client.js`, `navigate`: the scroll, then these), an effect before it. Once per write.
		afterNavigate(() => {
			const id = openId;
			if (id === null || step !== null || !kept.takeFresh(id)) return;
			window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
		});
	} else {
		let askedSignIn = false;
		$effect(() => {
			if (viewer !== 'guest' || askedSignIn) return;
			askedSignIn = true;
			untrack(() => session?.requireSignIn());
		});
	}

	return {
		get viewer() {
			return viewer;
		},
		get isMember() {
			return isMember;
		},
		get offline() {
			return offline;
		},
		/** The tab on screen (the list's `tab`). */
		get tab() {
			return tab;
		},
		list,
		/** The appointment on the right as read: the address's own, or the invitation's visit. */
		visit,
		/** Screen 54's invitation as read; `null` on the appointments' own pages. */
		invitation: invitation as Source extends { page: 'rating' } ? RatingInvitationRead : null,
		get openId() {
			return openId;
		},
		/** The screen the appointment opened (`time`, `for-whom`, `relative`, `note`, `cancel`), `null` for the 51. */
		get step() {
			return step;
		},
		/**
		 * A member's appointment once read — or kept through a session that ended on a write (D-W4-78): what screens
		 * 52 / 53 stand on (the 51 tells every other state).
		 */
		get opened() {
			return opened;
		},
		/** Changes whenever the right column shows another thing. */
		get paneKey() {
			return paneKey;
		},
		get paneEmpty() {
			return paneEmpty;
		},
		get doctorIds() {
			return doctorIds;
		},
		/** What was just saved on this appointment (D-W4-33), `null` for nothing or for another one's. */
		doneOf: (appointmentId: string) => memory?.doneOf(appointmentId) ?? null,
		justCanceled: (appointmentId: string) => memory?.justCanceled(appointmentId) ?? false,
		signIn: () => {
			session?.requireSignIn();
		},
		/** The session's read failed: it is asked again; else the list. */
		retry: () => {
			if (viewer === 'failed') session?.retryRead();
			else list.retry();
		},
		retrySession: () => {
			session?.retryRead();
		}
	};
}

import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { bookingPath, hintsOf, type BookingStep } from '$modules/appointments/lib/booking';
import { useBookingEntry } from './use-entry.svelte';
import { isPlainClick, useBookingNavigation } from './use-navigation.svelte';
import type { BookingChangeProps } from '../types';

/**
 * What every «Αλλαγή» screen of part 2 shares (record §3.3, U-102): the draft met through the address, the addresses of
 * the booking with the draft's hour and service, «←» / «Άκυρο» back exactly the steps that were opened (else the page in
 * place), the next screen as one more step, and the toast over the page's bar. A screen of the PERSON (`member`: who the
 * visit is for, the mobile, the name, the date of birth) has nothing to show a guest: it gives its place to screen 30,
 * whose button signs in (Ε1 = Α).
 */
export function useBookingChange(props: () => BookingChangeProps, { member = false } = {}) {
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const draft = useBookingEntry(() => props().slug);
	const navigation = useBookingNavigation();
	const signedIn = $derived(session?.isMember ?? false);

	const stepHref = (step: BookingStep | null) =>
		props().href(bookingPath(props().slug, step, hintsOf(draft.slot, props().serviceId ?? null)));
	// With no hour behind it (a link, a reload) screen 30 would send the reader to «Διαθεσιμότητα»: the doctor's page
	// instead (review w3-w2 R1 MINOR-2, the same rule as «Διαθεσιμότητα»).
	const fallbackHref = (step: BookingStep | null) =>
		step === null && !draft.slot ? props().profileHref : stepHref(step);
	const leave = (steps = 1, fallback: BookingStep | null = null) =>
		navigation.leave(fallbackHref(fallback), steps);

	// A screen of the person gives its place to screen 30 for a visitor who came here as a guest, or who signed out or
	// changed account here (`forgotten`). 🔴 Review w3-w3 R1 MAJOR-1 (U-84, U-112.2): a member whose session ended under
	// the screen (`expire`, a `401` on «Αποθήκευση») stays on it — the sign-in opens over it and the same person finds
	// what was typed after it.
	let memberHere = false;
	const forgottenAtStart = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		if (!member || !browser) return;
		const status = session?.status;
		const forgotten = session?.forgotten ?? 0;
		untrack(() => {
			if (status === 'member') memberHere = true;
			if ((status === 'guest' && !memberHere) || forgotten !== forgottenAtStart) {
				// The page's own address, already resolved by the screen.
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				void goto(fallbackHref(null), { replaceState: true });
			}
		});
	});

	return {
		draft,
		session,
		get signedIn() {
			return signedIn;
		},
		stepHref,
		/** «←»'s own address: the screen it goes back to (the doctor's page when no hour is behind it). */
		backHref: (fallback: BookingStep | null = null) => fallbackHref(fallback),
		leave,
		/** Opens `step` as one more step in the history (a press with a modifier keeps the link's own way). */
		open(step: BookingStep, event?: MouseEvent) {
			if (event && !isPlainClick(event)) return;
			event?.preventDefault();
			navigation.open(stepHref(step), navigation.depth + 1);
		},
		/** «←»: the link's own way with a modifier, else back the screen's steps. */
		back(steps = 1, fallback: BookingStep | null = null) {
			return (event: MouseEvent) => {
				if (!isPlainClick(event)) return;
				event.preventDefault();
				leave(steps, fallback);
			};
		},
		toast(message: string) {
			toasts?.show({ message, lift: 'page-bar' });
		}
	};
}

import { untrack } from 'svelte';
import { page } from '$app/state';
import { readBookingHints } from '$modules/appointments/lib/booking';
import { getBookingDraft, type BookingDraft } from '$modules/appointments/ui/booking-draft';

/**
 * Every booking screen meets the draft through its address (P-W3 §3.2.2): at once (the server's page too, so the hour
 * is drawn without JavaScript), and again whenever the address names other hints. The draft decides who speaks
 * (`BookingDraft.enter`): the address for a new choice on screen 30, the draft everywhere else.
 */
export function useBookingEntry(
	slug: () => string,
	kind: 'review' | 'change' = 'change'
): BookingDraft {
	const draft = getBookingDraft();
	untrack(() => draft.enter(slug(), readBookingHints(page.url.searchParams), kind));
	$effect.pre(() => {
		const hints = readBookingHints(page.url.searchParams);
		const current = slug();
		untrack(() => draft.enter(current, hints, kind));
	});
	return draft;
}

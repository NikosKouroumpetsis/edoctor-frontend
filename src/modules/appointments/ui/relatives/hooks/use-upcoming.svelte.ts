import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { upcomingScanQuery } from '$modules/appointments/api/appointment';
import { relativeUpcoming, type RelativeUpcomingFacts } from '$modules/appointments/lib/relatives';

/**
 * 🔴 D-W4-21 (U-139.4) · D-W4-59: the upcoming visits of the relative «Διαγραφή συγγενή;» asks about — the person's
 * upcoming read to the end (`scope=upcoming&limit=100`, every next page) while the window is open, afresh at every
 * opening, filtered by the relative's id. Where the read stands is the window's to act on: `pending` (the deletion
 * sleeps, D-W4-59.1), `unchecked` (it failed, never ran, or did not end within its pages: the window says it could not
 * check and the deletion is allowed, D-W4-59.3), else `facts` — the real number. The screen reads the doctor of the
 * first (D-W4-29: one public profile, never an id on screen).
 */
export function useRelativeUpcoming(options: { enabled: () => boolean }) {
	let relativeId = $state<string | null>(null);
	const asked = $derived(browser && options.enabled() && relativeId !== null);
	const scan = createQuery(() => ({ ...upcomingScanQuery(), enabled: asked }));
	// Every opening reads afresh: an answer of an earlier opening says nothing while the new one is on its way — nor
	// when the new one never ran (no network: `paused`, review w4-w9-r1 MINOR-1), which is «could not check».
	const pending = $derived(asked && scan.fetchStatus === 'fetching');
	const whole = $derived(
		asked && scan.fetchStatus === 'idle' && !scan.isError && scan.data?.complete === true
			? scan.data
			: null
	);
	const facts = $derived.by((): RelativeUpcomingFacts | null =>
		whole && relativeId ? relativeUpcoming(whole.items, relativeId) : null
	);

	return {
		/** What the window says once read whole: how many, and the first; `null` while read, unchecked or closed. */
		get facts() {
			return facts;
		},
		/** The read is on its way: the window's «Διαγραφή» sleeps until it answers or fails (D-W4-59.1). */
		get pending() {
			return pending;
		},
		/** Nothing can be said of the upcoming (a failure, no network, more pages than are read): D-W4-59.3. */
		get unchecked() {
			return asked && !pending && whole === null;
		},
		/** The doctor of the first upcoming visit, for the screen to name (`null` for none). */
		get doctorId() {
			return facts?.first?.doctorId ?? null;
		},
		/** The window opens on this relative: the read. */
		ask(id: string) {
			relativeId = id;
		},
		/** The window closed: nothing is read for it any more. */
		forget() {
			relativeId = null;
		}
	};
}

export type RelativeUpcoming = ReturnType<typeof useRelativeUpcoming>;

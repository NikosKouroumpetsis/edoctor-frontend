import { goto } from '$app/navigation';
import { page } from '$app/state';
import { readHistoryDepth } from '$shared/lib/navigation';

/** The patient's flows that count their steps in the history (`App.PageState`): an appointment's, the relatives'. */
export type AppointmentStepsFlow = 'appointment' | 'relatives';

/**
 * 🔴 U-102 / U-136 / U-137 (D-W3-31, P-W4 §3.6): every screen an appointment opens — «Αλλαγή», the cancellation — is a
 * page of its own in the history, opened from the appointment one step on (`page.state.appointment.depth` 1) or from
 * another of them (2: «Θέλετε απλώς άλλη ώρα;», «Προσθήκη συγγενή»). Leaving it goes back exactly those steps, so the
 * browser's «back» never opens the form again; opened from a link, a new tab or a reload it has nothing behind it, and
 * leaving replaces it with the page it belongs to (never a step out of the site). Always a real navigation, never shallow.
 * Screen 55 (U-139) counts a relative's form the same way, under its own key (`relatives`).
 */
export function useAppointmentSteps(flow: AppointmentStepsFlow = 'appointment') {
	let left = false;
	return {
		/** The steps behind this screen (0: opened directly). */
		get depth() {
			return readHistoryDepth(flow, page.state);
		},
		/**
		 * Opens `href` (already resolved by the screen) as one more step, `depth` steps from where the flow began; `inPlace`
		 * keeps the page's scroll and focus (from 950, where the list stays beside what opens).
		 */
		open(href: string, depth: number, inPlace = false) {
			const state: App.PageState = { [flow]: { depth } };
			// The screen's address, already resolved (a module knows no route).
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(href, inPlace ? { state, noScroll: true, keepFocus: true } : { state });
		},
		/**
		 * Goes back `steps` (all of them by default: to the appointment), else to `fallback` in place. Once per screen: one
		 * that already left (a save, then the closed appointment it read again) never goes back twice.
		 */
		leave(fallback: string, steps?: number) {
			if (left) return;
			left = true;
			const depth = readHistoryDepth(flow, page.state);
			const back = steps ?? depth;
			if (back > 0 && depth >= back) {
				history.go(-back);
				return;
			}
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(fallback, { replaceState: true });
		}
	};
}

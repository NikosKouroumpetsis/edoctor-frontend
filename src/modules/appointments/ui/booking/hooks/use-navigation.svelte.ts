import { goto } from '$app/navigation';
import { page } from '$app/state';
import { readHistoryDepth } from '$shared/lib/navigation';

/** A press the page may take over: the main button, no modifier (a new tab or window keeps the link's own way). */
export function isPlainClick(event: MouseEvent): boolean {
	return (
		!event.defaultPrevented &&
		event.button === 0 &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.shiftKey &&
		!event.altKey
	);
}

/**
 * 🔴 U-102 (the prototype's `go` / `leave`): every «Αλλαγή» is a screen of its own in the history. Opened from a booking
 * screen it carries how many steps lie back to that screen (`page.state.booking.depth`); leaving it goes back exactly
 * those steps, so the browser's «back» and «Άκυρο» agree. A screen opened from a link, a new tab or a reload has
 * nothing behind it: leaving it replaces it with the page (`fallback`), never a step out of the site.
 */
export function useBookingNavigation() {
	return {
		/** Opens `href` as one more step (`depth` steps from the page that opens it). */
		open(href: string, depth = 1) {
			// The screen's address, already resolved by the screen (a module knows no route).
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(href, { state: { booking: { depth } } });
		},
		/** Goes back `steps` (1, or 2 from «Νέος συγγενής» / the code), else to `fallback` in place. */
		leave(fallback: string, steps = 1) {
			// Review w3-w3 R1 MINOR-5: after a reload the entry still knows its steps (a saved hour is not undone by «back»).
			const depth = readHistoryDepth('booking', page.state);
			if (depth >= steps) {
				history.go(-steps);
				return;
			}
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(fallback, { replaceState: true });
		},
		/** The steps behind this screen (0: opened directly). */
		get depth() {
			return readHistoryDepth('booking', page.state);
		}
	};
}

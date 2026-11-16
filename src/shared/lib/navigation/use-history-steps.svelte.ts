import { goto } from '$app/navigation';
import { page } from '$app/state';
import { readHistoryDepth, type HistoryDepthFlow } from './stored-page-state';

/**
 * 🔴 U-102 (D-W3-31, P-W4 §3.6; shared since D-W51-50): every step screen a page opens — a «Αλλαγή», a cancellation, a
 * refusal — is a page of its own in the history, opened from that page one step on (`page.state[flow].depth` 1) or from
 * another step screen (2). Leaving it goes back exactly those steps, so the browser's «back» never opens the form again;
 * opened from a link, a new tab, a reload or another page it has nothing of its flow behind it, and leaving replaces it
 * with the page it belongs to (never a step out of the site). Always a real navigation, never shallow. `flow` is the
 * `App.PageState` key the caller's pages count their steps under.
 */
export function useHistorySteps(flow: HistoryDepthFlow) {
	let left = false;
	return {
		/** The steps behind this screen (0: opened directly). */
		get depth() {
			return readHistoryDepth(flow, page.state);
		},
		/**
		 * Opens `href` (already resolved by the caller) as one more step, `depth` steps from where the flow began; `inPlace`
		 * keeps the page's scroll and focus (where a list stays beside what opens).
		 */
		open(href: string, depth: number, inPlace = false) {
			const state = { [flow]: { depth } } as App.PageState;
			// The caller's address, already resolved (the shared code knows no route).
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(href, inPlace ? { state, noScroll: true, keepFocus: true } : { state });
		},
		/**
		 * Goes back `steps` (all of them by default: to the page the flow began on), else to `fallback` in place. Once per
		 * screen: one that already left (a save, then the closed item it read again) never goes back twice.
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

export type HistorySteps = ReturnType<typeof useHistorySteps>;

import type { BookingScreenData } from '../types';

/**
 * The booking's screen (wave 3 · screens 30, 31 and their «Αλλαγή» screens, P-W3 §3.1, D-W3-28): which of them the
 * route names. Each page composes what it needs from the doctor module and the appointments module (`use-review`,
 * `use-time`, `use-change`).
 */
export function useBookingScreen(data: () => BookingScreenData) {
	return {
		get step() {
			return data().step;
		}
	};
}

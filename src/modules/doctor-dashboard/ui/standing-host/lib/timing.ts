/** U-185.3 (`64-switch/sw.js:951-955`): the switch shows its transition for about a second, however fast the server is. */
export const DOCTOR_MODE_TRANSITION_MS = 1000;

/** What is left of the transition's second after `startedAt` (never below none). */
export const transitionLeft = (startedAt: number, now: number) =>
	Math.max(0, DOCTOR_MODE_TRANSITION_MS - (now - startedAt));

/** The two modes of one account (U-182.3): the patient's own pages, and the doctor's dashboard. */
export type ModeSide = 'patient' | 'doctor';

/**
 * 🔴 D-W51-77 · U-182.3 · D-W51-89: the side of the mode a page is in, by its path without the language — the doctor's
 * dashboard (`/doctor` and every page under it but the sign-up) reads the doctor's side, every other page the
 * patient's. The ONE rule of every badge that counts one side (the messages' unread conversations, the notifications).
 */
export function modeSideOfPath(basePath: string): ModeSide {
	const path = basePath.replace(/\/+$/u, '') || '/';
	if (path === '/doctor/onboarding' || path.startsWith('/doctor/onboarding/')) return 'patient';
	return path === '/doctor' || path.startsWith('/doctor/') ? 'doctor' : 'patient';
}

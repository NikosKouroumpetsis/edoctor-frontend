import { browser } from '$app/environment';
import { doctorModeStorageKey } from '$shared/config/env';
import type {
	DoctorMode,
	DoctorStandingHint,
	DoctorStandingKind
} from '$shared/state/doctor-standing';

/** The memory's shape version: `app.html` reads the same `v` before the first paint. */
export const DOCTOR_MODE_HINT_VERSION = 1;

const KINDS: readonly DoctorStandingKind[] = ['none', 'pending', 'doctor', 'payments'];
const MODES: readonly DoctorMode[] = ['PATIENT', 'DOCTOR'];

/**
 * 🔴 D-W51-19 · U-65.6: a stored memory, checked — only a known kind and mode of the right version count; anything
 * else (another shape, a tampered value, a name) is no memory. A mode of the doctor only with the doctor's kind.
 */
export function sanitizeDoctorModeHint(value: unknown): DoctorStandingHint | null {
	if (!value || typeof value !== 'object') return null;
	const stored = value as Record<string, unknown>;
	if (stored.v !== DOCTOR_MODE_HINT_VERSION) return null;
	const kind = KINDS.find((entry) => entry === stored.kind);
	const lastMode = MODES.find((entry) => entry === stored.lastMode);
	if (!kind || !lastMode) return null;
	return { kind, lastMode: kind === 'doctor' ? lastMode : 'PATIENT' };
}

/** What this device remembers (the browser only; nothing on the server, nothing on a failure). */
export function readDoctorModeHint(): DoctorStandingHint | null {
	if (!browser) return null;
	try {
		const stored = window.localStorage.getItem(doctorModeStorageKey);
		return stored ? sanitizeDoctorModeHint(JSON.parse(stored)) : null;
	} catch {
		return null;
	}
}

/** The answer's kind and mode, and nothing else — the only memory this module keeps. */
export function writeDoctorModeHint(hint: DoctorStandingHint) {
	if (!browser) return;
	const clean = sanitizeDoctorModeHint({ v: DOCTOR_MODE_HINT_VERSION, ...hint });
	if (!clean) return;
	try {
		window.localStorage.setItem(
			doctorModeStorageKey,
			JSON.stringify({ v: DOCTOR_MODE_HINT_VERSION, ...clean })
		);
	} catch {
		return;
	}
}

/** A guest, a sign-out, a deleted account: the device forgets (D-W51-19). */
export function forgetDoctorModeHint() {
	if (!browser) return;
	try {
		window.localStorage.removeItem(doctorModeStorageKey);
	} catch {
		return;
	}
}

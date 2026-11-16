import { untrack } from 'svelte';
import { createContext } from '$shared/lib/headless';
import { getSessionOptional } from '$shared/state/session';
import type { DoctorAppointmentSaved } from '$modules/doctor-dashboard/lib/detail';

/**
 * 🔴 D-W51-51 · D-W51-52 (the patient's D-W4-33 way), U-65.6: what screen 70 just saved on an appointment, for its 68 to
 * say («Η ώρα άλλαξε… Ήταν …», «Αποθηκεύτηκε.») — in this rune only, never in the address (the browser keeps an address
 * in its history and its links; the old hour must not leave the page). One per page tree (context, never a module
 * singleton); another appointment opened, a reload, a sign-out or another account empties it.
 */
export class DoctorAppointmentMemory {
	saved = $state<{ appointmentId: string; done: DoctorAppointmentSaved } | null>(null);

	/** A save of screen 70 on this appointment: its 68 says it. */
	remember(appointmentId: string, done: DoctorAppointmentSaved) {
		this.saved = { appointmentId, done };
	}

	/** What was just saved on this appointment, `null` for nothing (or for another one's). */
	doneOf(appointmentId: string): DoctorAppointmentSaved | null {
		return this.saved?.appointmentId === appointmentId ? this.saved.done : null;
	}

	/**
	 * Another appointment opens, or the list alone: what was said of any other one goes. Read untracked, so the address
	 * effect that calls it never re-runs on a save: screen 72 saves while the address is still its own (live 15/11).
	 */
	keepOnly(appointmentId: string | null) {
		untrack(() => {
			if (this.saved && this.saved.appointmentId !== appointmentId) this.saved = null;
		});
	}

	forget() {
		this.saved = null;
	}
}

export const [
	getDoctorAppointmentMemory,
	setDoctorAppointmentMemory,
	getDoctorAppointmentMemoryOptional
] = createContext<DoctorAppointmentMemory>('DoctorAppointmentMemory');

/** 🔴 U-65.6: a new memory, which a sign-out or another account empties, on whichever page they happen. */
export function useDoctorAppointmentMemory(): DoctorAppointmentMemory {
	const session = getSessionOptional();
	const memory = new DoctorAppointmentMemory();
	let seen = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		const forgotten = session?.forgotten ?? 0;
		if (forgotten === seen) return;
		seen = forgotten;
		untrack(() => memory.forget());
	});
	return memory;
}

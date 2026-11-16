import { untrack } from 'svelte';
import { createContext } from '$shared/lib/headless';
import { getSessionOptional } from '$shared/state/session';
import type { DoctorPatientDone } from '$modules/doctor-dashboard/lib/patients';

/**
 * 🔴 D-W51-76 · U-198.2 (screen 73; 68's `DoctorAppointmentMemory` way, U-65.6): what «Στοιχεία ασθενή» or the join just
 * wrote on a card, for THAT card to say («Αποθηκεύτηκε.», «Οι καρτέλες ενώθηκαν.») — keyed by the card's address
 * (`kind:id`), in this rune only, never in the address. One per page tree (context); another card opened, the list
 * alone, a reload, a sign-out or another account empties it.
 */
export class DoctorPatientMemory {
	done = $state<{ key: string; done: DoctorPatientDone } | null>(null);

	/** A write on the card of `key` (`kind:id`): that card says it when it shows again. */
	remember(key: string, done: DoctorPatientDone) {
		this.done = { key, done };
	}

	/** What was just written on the card of `key`, `null` for nothing (or for another card's). */
	doneOf(key: string): DoctorPatientDone | null {
		return this.done?.key === key ? this.done.done : null;
	}

	/** Another card opens, or the list alone: what was said of any other card goes (read untracked, as the 68's). */
	keepOnly(key: string | null) {
		untrack(() => {
			if (this.done && this.done.key !== key) this.done = null;
		});
	}

	forget() {
		this.done = null;
	}
}

export const [getDoctorPatientMemory, setDoctorPatientMemory, getDoctorPatientMemoryOptional] =
	createContext<DoctorPatientMemory>('DoctorPatientMemory');

/** 🔴 U-65.6: a new memory, which a sign-out or another account empties, on whichever page they happen. */
export function useDoctorPatientMemory(): DoctorPatientMemory {
	const session = getSessionOptional();
	const memory = new DoctorPatientMemory();
	let seen = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		const forgotten = session?.forgotten ?? 0;
		if (forgotten === seen) return;
		seen = forgotten;
		untrack(() => memory.forget());
	});
	return memory;
}

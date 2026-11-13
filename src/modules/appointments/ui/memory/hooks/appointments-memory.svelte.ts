import { untrack } from 'svelte';
import { createContext } from '$shared/lib/headless';
import { getSessionOptional } from '$shared/state/session';
import type { AppointmentDone } from '$modules/appointments/lib/detail';

/**
 * 🔴 D-W4-33 (P-W4 Σ-29), U-65.6: what the patient's pages remember right after a write, to say it on the appointment
 * (U-136.6 «Η ώρα άλλαξε. Ήταν …», U-137.6 «Σας στείλαμε email επιβεβαίωσης.», the 54's «Η κριτική υποβλήθηκε.») —
 * in this rune only, never in the address (the browser keeps an address in its history, its links and its referrers;
 * the old hour or a relative's name must not leave the page). One per page tree (context, never a module singleton); a
 * reload, a sign-out or another account empties it.
 */
export class AppointmentsMemory {
	/** The save just made on one appointment, said on it until another opens. */
	saved = $state<{ appointmentId: string; done: AppointmentDone } | null>(null);
	/** The appointment the patient just canceled (its «Σας στείλαμε email επιβεβαίωσης.», D-W4-11). */
	canceledId = $state<string | null>(null);
	/**
	 * Screen 52's «Προσθήκη συγγενή»: the relative just added, chosen on «Για ποιον…» of its appointment until
	 * «Αποθήκευση» or «Άκυρο» (the booking's `pendingVisitor`, record §3.3) — an id, never a name.
	 */
	pendingVisitor = $state<{ appointmentId: string; relativeId: string } | null>(null);
	/**
	 * U-153 (card w4-w12): the appointment whose notice was JUST written and whose page has not shown it yet. Lit by the
	 * write alone and taken once (`takeFresh`), so it is no rune: nothing is drawn from it.
	 */
	#fresh: string | null = null;

	/** A save of this appointment: its notice; the relative chosen for it has done its part (review w4-w5 R1 MINOR-2). */
	remember(appointmentId: string, done: AppointmentDone) {
		this.saved = { appointmentId, done };
		this.canceledId = null;
		this.#fresh = appointmentId;
		this.letGo(appointmentId);
	}

	rememberCanceled(appointmentId: string) {
		this.letGo(appointmentId);
		this.canceledId = appointmentId;
		this.saved = null;
		this.#fresh = appointmentId;
	}

	/**
	 * Whether this appointment's notice was just written; true only once per write. Its page starts at the top for it
	 * (`useAppointmentsPages`), and a later return with nothing new written keeps its place.
	 */
	takeFresh(appointmentId: string): boolean {
		if (this.#fresh !== appointmentId) return false;
		this.#fresh = null;
		return true;
	}

	/** What was just saved on this appointment, `null` for nothing (or for another one's). */
	doneOf(appointmentId: string): AppointmentDone | null {
		return this.saved?.appointmentId === appointmentId ? this.saved.done : null;
	}

	justCanceled(appointmentId: string): boolean {
		return this.canceledId === appointmentId;
	}

	choose(appointmentId: string, relativeId: string | null) {
		this.pendingVisitor = relativeId ? { appointmentId, relativeId } : null;
	}

	/** The relative just added for this appointment, `null` for none (or for another one's). */
	chosenFor(appointmentId: string): string | null {
		return this.pendingVisitor?.appointmentId === appointmentId
			? this.pendingVisitor.relativeId
			: null;
	}

	/** Another appointment opens, or the pages are left: what was said about any other one goes. */
	keepOnly(appointmentId: string | null) {
		if (this.saved && this.saved.appointmentId !== appointmentId) this.saved = null;
		if (this.canceledId !== appointmentId) this.canceledId = null;
		if (this.pendingVisitor && this.pendingVisitor.appointmentId !== appointmentId) {
			this.pendingVisitor = null;
		}
		if (this.#fresh !== appointmentId) this.#fresh = null;
	}

	private letGo(appointmentId: string) {
		if (this.pendingVisitor?.appointmentId === appointmentId) this.pendingVisitor = null;
	}

	forget() {
		this.saved = null;
		this.canceledId = null;
		this.pendingVisitor = null;
		this.#fresh = null;
	}
}

export const [getAppointmentsMemory, setAppointmentsMemory, getAppointmentsMemoryOptional] =
	createContext<AppointmentsMemory>('AppointmentsMemory');

/** 🔴 U-65.6: a new memory, which a sign-out or another account empties, on whichever page they happen. */
export function useAppointmentsMemory(): AppointmentsMemory {
	const session = getSessionOptional();
	const memory = new AppointmentsMemory();
	let seen = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		const forgotten = session?.forgotten ?? 0;
		if (forgotten === seen) return;
		seen = forgotten;
		untrack(() => memory.forget());
	});
	return memory;
}

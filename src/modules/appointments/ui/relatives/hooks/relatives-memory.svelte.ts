import { untrack } from 'svelte';
import { getSessionOptional } from '$shared/state/session';
import type { RelativesDone } from '$modules/appointments/lib/relatives';

/**
 * 🔴 D-W4-33 (P-W4 Σ-29), U-65.6: what «Οι συγγενείς μου» says right after a write («Η Μαρία Παππά προστέθηκε.»,
 * «Οι αλλαγές αποθηκεύτηκαν.», «Ο Γιώργος Παππάς διαγράφηκε.») — in the page's memory only, never in the address (the
 * browser keeps an address in its history, its links and its referrers; a relative's name must not leave the page).
 * Said until the person opens another relative or a new one (`rel.js:198-199`); a reload, a sign-out or another
 * account empties it.
 */
export class RelativesMemory {
	done = $state<RelativesDone | null>(null);

	remember(done: RelativesDone) {
		this.done = done;
	}

	forget() {
		this.done = null;
	}
}

/** 🔴 U-65.6: a new memory for the page, which a sign-out or another account empties. */
export function useRelativesMemory(): RelativesMemory {
	const session = getSessionOptional();
	const memory = new RelativesMemory();
	let seen = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		const forgotten = session?.forgotten ?? 0;
		if (forgotten === seen) return;
		seen = forgotten;
		untrack(() => memory.forget());
	});
	return memory;
}

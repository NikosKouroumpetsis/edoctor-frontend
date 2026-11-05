import { untrack } from 'svelte';
import { createContext } from '$shared/lib/headless';
import { getSessionOptional } from '$shared/state/session';
import { ThreadMemory } from './thread-memory.svelte';

/** The chips of an account with both sides (U-84 Π4): by whom the conversation is with. */
export type InboxFilter = 'all' | 'patients' | 'doctors';

/**
 * What the messages' pages keep while the person moves between them (one per page tree, context, never a module singleton).
 * `/messages` and `/messages/<id>` are two routes, each its own page: R-11: the chip stays chosen, as on the application's
 * tab, which stays mounted; R-10: what has not left outlives the page it was sent from.
 */
export class InboxMemory {
	filter = $state<InboxFilter>('all');
	readonly thread = new ThreadMemory();

	forget() {
		this.filter = 'all';
		this.thread.forget();
	}
}

export const [getInboxMemory, setInboxMemory, getInboxMemoryOptional] =
	createContext<InboxMemory>('InboxMemory');

/** 🔴 U-84, U-65.6: a new memory, which a sign-out or another account empties, on whichever page they happen. */
export function useInboxMemory(): InboxMemory {
	const session = getSessionOptional();
	const memory = new InboxMemory();
	let seen = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		const forgotten = session?.forgotten ?? 0;
		if (forgotten === seen) return;
		seen = forgotten;
		untrack(() => memory.forget());
	});
	return memory;
}

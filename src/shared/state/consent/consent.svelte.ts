import { createContext } from '$shared/lib/headless';
import {
	readConsentSnapshot,
	writeConsentSnapshot,
	type ConsentSnapshot
} from '$shared/storage/consent-storage';

/**
 * The tracking decision this browser keeps, as the page tree reads it (wave 4.5, screen 62): the cookie card of the
 * frame and the page «Εργαλεία τρίτων και cookies» are two surfaces of ONE decision — the same storage, the same
 * snapshot — so a choice saved on the one is what the other shows, at once. One per page tree (context, SSR-safe: the
 * server reads nothing and knows no decision); first party, no personal data.
 */
export class ConsentDecision {
	snapshot = $state<ConsentSnapshot | null>(null);
	/** The browser's storage has been read: until then nobody may say «no decision yet». */
	loaded = $state(false);

	/** Reads the stored decision once, in the browser; a later call changes nothing. */
	load() {
		if (this.loaded) return;
		this.snapshot = readConsentSnapshot();
		this.loaded = true;
	}

	/** Keeps a decision in the browser and shows it to every surface of the tree. */
	save(next: ConsentSnapshot) {
		writeConsentSnapshot(next);
		this.snapshot = next;
		this.loaded = true;
	}
}

export const [getConsentDecision, setConsentDecision, getConsentDecisionOptional] =
	createContext<ConsentDecision>('ConsentDecision');

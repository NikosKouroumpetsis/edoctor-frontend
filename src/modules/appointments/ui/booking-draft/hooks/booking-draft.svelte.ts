import { untrack } from 'svelte';
import { createContext } from '$shared/lib/headless';
import { getSessionOptional } from '$shared/state/session';
import {
	hintsKey,
	hintsOf,
	slotOfHints,
	type BookingHints,
	type BookingSlotChoice,
	type BookingVisitor
} from '$modules/appointments/lib/booking';

/**
 * 🔴 U-112.2 (P-W3 §3.2.8), U-65.6: the booking in progress — one doctor at a time — kept while the reader goes to a
 * «Αλλαγή» screen and back, to the doctor's page and back, or to any other page of the site. One per page tree
 * (context, never a module singleton: on the server each request makes its own, empty). The server's reads (the
 * person, the readiness, the slots) stay in TanStack Query and are never copied here. Only in this rune: the visitor,
 * the note and the first-visit answer go into no address, storage, cookie or log, and a sign-out or another account in
 * the tab empties it; a session that merely ended (`expire`) does not.
 */
export class BookingDraft {
	/** The doctor this booking is for: another doctor starts a new one. */
	doctorSlug = $state<string | null>(null);
	/** The hour chosen, as its office and office-local day and minute. */
	slot = $state<BookingSlotChoice | null>(null);
	/** The service chosen (`null`: the doctor's default, the screen's to resolve). */
	serviceId = $state<string | null>(null);
	/** The service the hour was chosen with: another one since then makes a lost hour the length's (record §3.3). */
	slotServiceId = $state<string | null>(null);
	visitor = $state<BookingVisitor>({ kind: 'self' });
	/** The relative just added on «Νέος συγγενής», chosen on «Για ποιον…» until its «Αποθήκευση». */
	pendingVisitor = $state<string | null>(null);
	/** Ε2: «Ναι» preselected. */
	firstVisit = $state<'yes' | 'no'>('yes');
	/** ≤ 500 code points (the page clamps it); words of health maybe, so only here. */
	note = $state('');
	/** The mobile a code was sent to, ONLY as its mask («+30 69•• ••• 412»), for «Στείλαμε … στο». */
	phoneDestination = $state<string | null>(null);
	/** When «Αποστολή νέου κωδικού» may go again (an instant): the wait outlives the code screen's own life. */
	phoneResendAt = $state<number | null>(null);
	/** The hints the address and this draft last agreed on (`hintsKey`). */
	syncedHints = $state<string | null>(null);

	/**
	 * A booking page opened with its address's hints. Another doctor (or none yet: a link, a reload): a new booking, the
	 * address speaks. The same doctor: a «Αλλαγή» screen (`change`) never lets its address speak — it was opened with the
	 * hints of its time, and a «back», a «forward» or a reload of it must not undo a saved choice. Screen 30 (`review`)
	 * lets it speak only for hints it never agreed with (the doctor's page chose another hour): 🔴 D-W3-31, its own
	 * address follows the draft by a REAL navigation, so the entry a «back» returns to always holds what was agreed.
	 */
	enter(slug: string, hints: BookingHints, page: 'review' | 'change' = 'review'): void {
		const key = hintsKey(hints);
		if (this.doctorSlug !== slug) {
			this.forget();
			this.doctorSlug = slug;
		} else if (page === 'change' || this.syncedHints === key) {
			return;
		}
		const slot = slotOfHints(hints);
		if (slot) {
			this.slot = slot;
			this.slotServiceId = hints.service ?? null;
		}
		if (hints.service) this.serviceId = hints.service;
		this.syncedHints = key;
	}

	/** The hints of this draft as screen 30's address keeps them: the hour and the service CHOSEN (none: the default). */
	get hints(): BookingHints {
		return hintsOf(this.slot, this.serviceId);
	}

	/** «Αποθήκευση» of «Διαθεσιμότητα»: the new hour, with the service it was chosen for. */
	chooseSlot(slot: BookingSlotChoice, serviceId: string | null): void {
		this.slot = slot;
		this.slotServiceId = serviceId;
	}

	/** Everything goes (a sign-out, another account, another doctor). */
	forget(): void {
		this.doctorSlug = null;
		this.slot = null;
		this.serviceId = null;
		this.slotServiceId = null;
		this.visitor = { kind: 'self' };
		this.pendingVisitor = null;
		this.firstVisit = 'yes';
		this.note = '';
		this.phoneDestination = null;
		this.phoneResendAt = null;
		this.syncedHints = null;
	}
}

export const [getBookingDraft, setBookingDraft, getBookingDraftOptional] =
	createContext<BookingDraft>('BookingDraft');

/** 🔴 U-112.2, U-65.6: a new draft, which a sign-out or another account empties, on whichever page they happen. */
export function useBookingDraft(): BookingDraft {
	const session = getSessionOptional();
	const draft = new BookingDraft();
	let seen = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		const forgotten = session?.forgotten ?? 0;
		if (forgotten === seen) return;
		seen = forgotten;
		untrack(() => draft.forget());
	});
	return draft;
}

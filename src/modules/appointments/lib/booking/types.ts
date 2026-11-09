/**
 * The booking's view models (wave 3 · screens 30, 31 and their «Αλλαγή» screens): built in `lib/` from the facts plus
 * the messages, so the pages render words they never assembled. Type-only.
 */
import type { BookingBlockerCode } from '$modules/appointments/api/readiness';

/** The screens of the booking under `/doctors/<slug>/booking` (the application's names, P-W3 Σ-1). */
export type BookingStep =
	| 'time'
	| 'service'
	| 'for-whom'
	| 'relative'
	| 'details/phone'
	| 'details/code'
	| 'details/name'
	| 'details/birth-date'
	| 'success';

/**
 * 🔴 P-W3 §3.2.5: the address's hints — no personal fact, each checked by its pattern (an id, a `YYYY-MM-DD` day, an
 * `HH:MM` time); a bad one is simply absent.
 */
export type BookingHints = { office?: string; date?: string; time?: string; service?: string };

/** The hour the reader chose: its office and its office-local day and minute (two offices may both offer 10:00). */
export type BookingSlotChoice = { officeId: string; date: string; startMinute: number };

/** Who the visit is for: the account holder, or one of their relatives. */
export type BookingVisitor = { kind: 'self' } | { kind: 'relative'; relativeId: string };

/**
 * Where the chosen hour stands against the slots just read: `offered`, `waiting` (no answer yet: nothing is claimed),
 * `gone-duration` (another service's length no longer fits it, record §3.3) or `gone` (taken, or never offered).
 */
export type BookingSlotState = 'offered' | 'waiting' | 'gone-duration' | 'gone';

/** One line under a row's value: muted words, a refusal (red) or a warning (the orange box, U-91.1). */
export type BookingCardLine = { text: string; tone: 'muted' | 'danger' | 'warning' };

/** A row's button: «Αλλαγή» or «Προσθήκη», dark when it is the way out (`emphasis`), and the screen it opens. */
export type BookingCardAction = {
	kind: 'change' | 'add';
	step: BookingStep;
	label: string;
	ariaLabel: string;
	emphasis: boolean;
};

export type BookingCardRowId =
	| 'status'
	| 'date-time'
	| 'office'
	| 'reason'
	| 'visitor'
	| 'note'
	| 'name'
	| 'phone'
	| 'birth-date'
	| 'price'
	| 'policy';

/**
 * One row of the card (record §3.2): its label, its value (`money` the cost's 16/600, `status` the state's pill), the
 * lines under it, the guest's «Συνδεθείτε για κόστος» (`signIn`) and its button.
 */
export type BookingCardRow = {
	id: BookingCardRowId;
	label: string;
	value: string | null;
	valueStyle?: 'money' | 'status-pending' | 'status-confirmed';
	signIn?: string;
	lines: BookingCardLine[];
	action: BookingCardAction | null;
};

/** The card's head: the photo, the specialty, the name and the rating. */
export type BookingCardHead = {
	photo: { src: string; alt: string } | null;
	specialty: string;
	name: string;
	rating: { score: string; reviews: string; label: string } | null;
};

export type BookingCard = { head: BookingCardHead; rows: BookingCardRow[] };

/** What a blocker code means to a patient (or `null`: nothing the booking can say), and where it sends them. */
export type BookingBlockerReading = {
	message: string | null;
	action: BookingFailureAction;
};

/** The one way out a refusal offers (the application's `BookingFailureAction`, without «Τα ραντεβού μου», U-103.1). */
export type BookingFailureAction =
	| 'pick-slot'
	| 'complete-name'
	| 'complete-phone'
	| 'open-doctor'
	| 'fix-note'
	| 'sign-in'
	| 'retry';

/** A refused booking, as the page says it: the sentence, the way out, and the note's own message under the field. */
export type BookingFailureNotice = {
	action: BookingFailureAction;
	message: string | null;
	noteError: string | null;
};

/**
 * What «Επιβεβαίωση κράτησης» does now (P-W3 §3.2.3): `sign-in` (a guest), `locked` (the hour is gone or a blocker
 * stands, with its words), `open` (a missing name or mobile opens its screen), `submit` (the body is whole).
 */
export type BookingSubmitDecision =
	| { kind: 'sign-in' }
	| { kind: 'locked'; reason: 'waiting' | 'slot' | 'blocked'; messages: string[] }
	| { kind: 'open'; step: 'details/name' | 'details/phone' }
	| { kind: 'submit' };

export type { BookingBlockerCode };

/** Where the deletion's code goes: the account's verified email first, else its verified mobile (the server's choice). */
export type DeletionChannel = 'email' | 'phone';

/** One kind of data the deletion removes and how many rows of it the account has (the server's own name of it). */
export type DeletionRemovedItem = { item: string; count: number };

/** What stays after the deletion, why, and for at most how many years (the server's codes). */
export type DeletionRetainedItem = { category: string; purpose: string; maxRetentionYears: number };

/**
 * `GET /auth/account-deletion/me` as FACTS, in the server's order and with its own codes (no word of ours): whether the
 * account may be deleted and, if not, why; where the code will go, hidden by the server; what goes, the warnings, what
 * stays. 🔴 U-65.6: `codeDestinationMasked` is kept only when it is a mask — never a whole address.
 */
export type DeletionPreviewFacts = {
	allowed: boolean;
	refusal: string | null;
	codeChannel: DeletionChannel | null;
	codeDestinationMasked: string | null;
	removed: DeletionRemovedItem[];
	warnings: string[];
	retained: DeletionRetainedItem[];
};

/** The channel the code went to; the address itself is never answered. */
export type DeletionCodeSent = { channel: DeletionChannel };

/**
 * Why a call of the deletion was refused (the application's `AccountDeletionFailureKind`): a code that is wrong, spent
 * or locked out, too many sends or tries, an administration account, an account with no verified channel, a session
 * the server no longer knows, no answer at all — or something this build cannot name.
 */
export type DeletionFailureKind =
	| 'invalid-code'
	| 'locked'
	| 'rate-limited'
	| 'stale-code'
	| 'backoffice'
	| 'no-channel'
	| 'session-ended'
	| 'unreachable'
	| 'unknown';

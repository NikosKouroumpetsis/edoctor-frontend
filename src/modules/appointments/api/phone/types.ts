/**
 * Why a step of the phone challenge was refused (record §3.3, the application's `BookingDetailsFailureKind`): the number
 * belongs to another account (`409`), a wrong or spent code, a lock, too many tries, the session, else.
 */
export type BookingPhoneFailure =
	| 'number-taken'
	| 'invalid-code'
	| 'stale-code'
	| 'locked'
	| 'rate-limited'
	| 'session'
	| 'unknown';

/** What starting the challenge answered: a code went out, or the number was the account's already. */
export type BookingPhoneStartFacts = { alreadyVerified: boolean };

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

/**
 * Wave 4.5 · screen 58: why a step of the change of the sign-in mobile was refused — the number is another account's
 * (`409`), a number the server does not take, a wrong or spent code, too many tries, the session (`EC401` alone), else.
 */
export type PhoneChangeFailure =
	| 'taken'
	| 'invalid-value'
	| 'invalid-code'
	| 'stale-code'
	| 'rate-limited'
	| 'session'
	| 'unknown';

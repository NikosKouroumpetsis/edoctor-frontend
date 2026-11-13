import { ApiError } from '$shared/lib/http';

/** What a refused code was, in the kinds any surface that sends a code tells apart (the application's reading). */
export type OtpFailureKind =
	| 'invalid-code'
	| 'locked'
	| 'rate-limited'
	| 'stale-code'
	| 'sign-in-unavailable'
	| 'unknown';

const INVALID_CODE_ERROR_CODES = ['EC011', 'EC010'];
const LOCKED_ERROR_CODES = ['USER_LOCKED', 'EC008'];
const STALE_CODE_ERROR_CODES = ['EC007', 'EC009'];
const SIGN_IN_UNAVAILABLE_ERROR_CODE = 'SIGN_IN_NOT_AVAILABLE';
const WRONG_CREDENTIALS_ERROR_CODE = 'EC412';
const SPENT_TICKET_ERROR_CODES = ['EC010', 'EC016'];
const ALREADY_ONBOARDED_ERROR_CODE = 'EC415';

const codeOf = (error: unknown) => (error instanceof ApiError ? error.errorCode : undefined);

/** Reads a refused code by the backend's own code (`readAuthOtpFailure` of the application). */
export function readOtpFailure(error: unknown): OtpFailureKind {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.errorCode === SIGN_IN_UNAVAILABLE_ERROR_CODE) return 'sign-in-unavailable';
	if (error.errorCode && LOCKED_ERROR_CODES.includes(error.errorCode)) return 'locked';
	if (error.status === 429) return 'rate-limited';
	if (error.errorCode && STALE_CODE_ERROR_CODES.includes(error.errorCode)) return 'stale-code';
	return error.errorCode && INVALID_CODE_ERROR_CODES.includes(error.errorCode)
		? 'invalid-code'
		: 'unknown';
}

export type PasswordFailureKind =
	| 'wrong-credentials'
	| 'rate-limited'
	| 'sign-in-unavailable'
	| 'unknown';

export function readPasswordFailure(error: unknown): PasswordFailureKind {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.errorCode === SIGN_IN_UNAVAILABLE_ERROR_CODE) return 'sign-in-unavailable';
	if (error.status === 429) return 'rate-limited';
	return error.errorCode === WRONG_CREDENTIALS_ERROR_CODE ? 'wrong-credentials' : 'unknown';
}

/** A refused send of a phone number is the one failure the visitor can fix themselves. */
export function isPhoneRefusal(error: unknown): boolean {
	return error instanceof ApiError && error.status === 400;
}

export function isRateLimited(error: unknown): boolean {
	return error instanceof ApiError && error.status === 429;
}

export function isUnauthorized(error: unknown): boolean {
	return error instanceof ApiError && error.status === 401;
}

/** A spent or expired ticket: the only way on is to start the flow again. */
export function isSpentTicket(error: unknown): boolean {
	const code = codeOf(error);
	return Boolean(code && SPENT_TICKET_ERROR_CODES.includes(code));
}

/** A `400` is how a legal version that moved on is refused: the versions are read again and the send repeated once. */
export function isLegalVersionRefusal(error: unknown): boolean {
	return error instanceof ApiError && error.status === 400;
}

/** The `422` the server answers with the field's own name (`isBirthDateRefusal` of the application). */
export function isBirthDateRefusal(error: unknown): boolean {
	return (
		error instanceof ApiError && error.status === 422 && /\bdateOfBirth\b/u.test(error.message)
	);
}

/** A profile that already exists is what the caller asked for, so this refusal counts as success. */
export function isAlreadyOnboarded(error: unknown): boolean {
	return (
		error instanceof ApiError &&
		error.status === 409 &&
		error.errorCode === ALREADY_ONBOARDED_ERROR_CODE
	);
}

/** Whether a set-password refusal is about the CODE half, and how: the code step has to show it. */
export type SetPasswordCodeRejection = 'invalid' | 'locked' | 'stale';

export function readSetPasswordCodeRejection(error: unknown): SetPasswordCodeRejection | null {
	const code = codeOf(error);
	if (!code) return null;
	if (LOCKED_ERROR_CODES.includes(code)) return 'locked';
	if (STALE_CODE_ERROR_CODES.includes(code)) return 'stale';
	return INVALID_CODE_ERROR_CODES.includes(code) ? 'invalid' : null;
}

/**
 * Wave 4.5 · screen 59: why a write of the account's own password was refused — the change (current + new), the code's
 * send, or the set with the mailed code — by the same codes the sign-in's steps read. 🔴 A `401` alone says nothing: a
 * wrong current password (`EC412`) and a wrong code (`EC011`) are `401` too, so ONLY `EC401`, the session gate's
 * refusal, means the session is gone.
 */
export type AccountPasswordFailure =
	| 'session'
	| 'wrong-password'
	| 'invalid-code'
	| 'stale-code'
	| 'locked'
	| 'no-password'
	| 'unavailable'
	| 'rate-limited'
	| 'invalid-value'
	| 'unknown';

const SESSION_REFUSED_ERROR_CODE = 'EC401';

export function readAccountPasswordFailure(error: unknown): AccountPasswordFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const code = error.errorCode ?? '';
	if (error.status === 401 && code === SESSION_REFUSED_ERROR_CODE) return 'session';
	if (code === WRONG_CREDENTIALS_ERROR_CODE) return 'wrong-password';
	if (code === SIGN_IN_UNAVAILABLE_ERROR_CODE) return 'unavailable';
	const rejection = readSetPasswordCodeRejection(error);
	if (rejection === 'locked') return 'locked';
	if (error.status === 429) return 'rate-limited';
	if (rejection === 'stale') return 'stale-code';
	if (rejection === 'invalid') return 'invalid-code';
	// An account with no password yet answers the change with «not found» (it sets one with the code instead).
	if (error.status === 404) return 'no-password';
	if (error.status === 422 || error.status === 400) return 'invalid-value';
	return 'unknown';
}

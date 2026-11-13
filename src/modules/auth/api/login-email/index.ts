import type { QueryClient } from '@tanstack/svelte-query';
import type {
	ApiRequestBody,
	LoginEmailChangeStartResult,
	LoginEmailChangeVerifyResult
} from '$shared/lib/api-client';
import { ApiError, httpSessionPost } from '$shared/lib/http';
import { authQueryKeys, type PatientSelfFacts } from '$modules/auth/api/session';

const LOGIN_EMAIL_PATH = '/auth/login-email/me';

/**
 * Why a step of the change of the sign-in email was refused (wave 4.5, screen 58; the server's table, `w45-b2`): the
 * address belongs to another account (`409 EC415`), 🔴 D-W45-16 a provider is linked (Google, Apple or both: no code is
 * sent), an address that is none, a wrong or spent code, too many tries, the session — else (a closed channel, a lock)
 * the general «it did not go through», with no detail.
 */
export type LoginEmailChangeFailure =
	| 'taken'
	| 'provider-google'
	| 'provider-apple'
	| 'provider-both'
	| 'invalid-value'
	| 'invalid-code'
	| 'stale-code'
	| 'rate-limited'
	| 'session'
	| 'unknown';

/** What starting the change answered: a code went to the new address, or the address was the account's already. */
export type LoginEmailChangeStartFacts = { alreadyVerified: boolean };

/**
 * The new sign-in address (`POST /auth/login-email/me/start`): a code goes to IT alone; until the code is given the old
 * one holds (U-163). The body is the address and nothing else — the account is the cookies' (one more field is a `422`).
 */
export async function startLoginEmailChange(email: string): Promise<LoginEmailChangeStartFacts> {
	const body: ApiRequestBody<'startLoginEmailChange'> = { email };
	const answer = await httpSessionPost<LoginEmailChangeStartResult>(`${LOGIN_EMAIL_PATH}/start`, {
		body
	});
	return { alreadyVerified: answer?.alreadyVerified === true };
}

/** «Αποστολή ξανά» (`POST /auth/login-email/me/resend`): an empty body by contract. */
export async function resendLoginEmailChange(): Promise<void> {
	const body: ApiRequestBody<'resendLoginEmailChangeCode'> = {};
	await httpSessionPost<LoginEmailChangeStartResult>(`${LOGIN_EMAIL_PATH}/resend`, { body });
}

// 🔴 U-168: the address comes back only as the server hides it (`e***i@example.gr`); anything else is no value.
const EMAIL_MASK = /\*{3}/u;
const MAX_MASK_LENGTH = 120;

/**
 * The code the person typed (`POST /auth/login-email/me/verify`): the address becomes the account's, every OTHER device
 * is signed out and this one goes on with the cookies of the answer. Of the answer only the address as the server hides
 * it leaves `api/` — `null` for one that is no mask.
 */
export async function verifyLoginEmailChange(code: string): Promise<{ masked: string | null }> {
	const body: ApiRequestBody<'verifyLoginEmailChangeCode'> = { code };
	const answer = await httpSessionPost<LoginEmailChangeVerifyResult>(`${LOGIN_EMAIL_PATH}/verify`, {
		body
	});
	const masked = typeof answer?.loginEmailMasked === 'string' ? answer.loginEmailMasked.trim() : '';
	return {
		masked: masked && masked.length <= MAX_MASK_LENGTH && EMAIL_MASK.test(masked) ? masked : null
	};
}

/**
 * The session's own memory of the person takes the new address as the verify answered it (the server's mask), so every
 * page that names the account says it at once — before, and whether or not, the confirming read comes back. Nothing is
 * written for a guest or for an answer that is no mask.
 */
export function keepLoginEmailMask(client: QueryClient, masked: string | null): void {
	if (!masked) return;
	client.setQueryData<PatientSelfFacts>(authQueryKeys.patientSelf(), (self) =>
		self?.signedIn ? { ...self, maskedLoginEmail: masked } : self
	);
}

const SESSION_REFUSED_ERROR_CODE = 'EC401';
const TAKEN_ERROR_CODE = 'EC415';
// 🔴 D-W45-16: the refusal's reason travels in its message (a refusal has no `data`), in a fixed order.
const PROVIDER_LINKED = /LOGIN_EMAIL_CHANGE_PROVIDER_LINKED:(GOOGLE,APPLE|GOOGLE|APPLE)\b/u;
const PROVIDER_FAILURES = {
	GOOGLE: 'provider-google',
	APPLE: 'provider-apple',
	'GOOGLE,APPLE': 'provider-both'
} as const satisfies Record<string, LoginEmailChangeFailure>;
// «No challenge is open»: a code that expired, or one already spent — neither is a typo.
const STALE_CODE_ERROR_CODES = ['EC007', 'EC009'];
const INVALID_CODE_ERROR_CODES = ['EC011', 'EC010'];

/**
 * A refused step, by the server's own code. A `401` alone says nothing — a wrong code and a channel that may not open
 * are `401` too — so only `EC401`, the session gate's refusal, means the session is gone. The SAME `403` without the
 * provider's words is not the provider's case.
 */
export function readLoginEmailChangeFailure(error: unknown): LoginEmailChangeFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const code = error.errorCode ?? '';
	if (error.status === 401 && code === SESSION_REFUSED_ERROR_CODE) return 'session';
	if (error.status === 409 && (code === TAKEN_ERROR_CODE || code === '')) return 'taken';
	if (error.status === 403) {
		const provider = PROVIDER_LINKED.exec(error.message)?.[1] as
			| keyof typeof PROVIDER_FAILURES
			| undefined;
		return provider ? PROVIDER_FAILURES[provider] : 'unknown';
	}
	if (error.status === 429) return 'rate-limited';
	if (STALE_CODE_ERROR_CODES.includes(code)) return 'stale-code';
	if (INVALID_CODE_ERROR_CODES.includes(code)) return 'invalid-code';
	if (error.status === 422 || error.status === 400) return 'invalid-value';
	return 'unknown';
}

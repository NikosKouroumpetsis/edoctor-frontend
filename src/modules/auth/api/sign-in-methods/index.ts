import { queryOptions } from '@tanstack/svelte-query';
import type { ApiRequestBody, SignInMethodsView } from '$shared/lib/api-client';
import { ApiError, httpSessionGet, httpSessionPost } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { authQueryKeys } from '$modules/auth/api/session';

const SIGN_IN_METHODS_PATH = '/auth/sign-in-methods/me';

/** The providers an account may be linked to, in the server's own words and order (`GOOGLE` before `APPLE`). */
export const signInProviders = ['GOOGLE', 'APPLE'] as const;
export type SignInProviderId = (typeof signInProviders)[number];

/**
 * Wave 4.5 · screen 59 (D-W45-37): how the account signs in — whether it has a password today (`set`) and whether it
 * may set one with the mailed code (`canSet`: a verified sign-in email), and ONLY the providers linked to it, each with
 * whether it may be unlinked (D-W45-38). Two booleans about the password, never the password.
 */
export type SignInMethodsFacts = {
	passwordStatus: { set: boolean; canSet: boolean };
	providers: { provider: SignInProviderId; canUnlink: boolean }[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The server's answer as the page's facts. 🔴 U-65.6: read at the boundary — an answer that says nothing of the
 * password is no answer (`null`: the page says it could not read, never «Δεν έχει οριστεί» by default); a provider
 * outside the closed list, or named twice, is dropped; `canUnlink` is true only when the server says exactly so.
 */
export function mapSignInMethods(answer: unknown): SignInMethodsFacts | null {
	if (!isRecord(answer) || !isRecord(answer.passwordStatus)) return null;
	const { set, canSet } = answer.passwordStatus;
	if (typeof set !== 'boolean' || typeof canSet !== 'boolean') return null;
	const listed = Array.isArray(answer.providers) ? answer.providers.filter(isRecord) : [];
	return {
		passwordStatus: { set, canSet },
		providers: signInProviders.flatMap((provider) => {
			const entry = listed.find((candidate) => candidate.provider === provider);
			return entry ? [{ provider, canUnlink: entry.canUnlink === true }] : [];
		})
	};
}

/**
 * The account's sign-in methods (`GET /auth/sign-in-methods/me`), read in the browser for a member; 🔴 U-65.6:
 * personal, gone at a sign-out. An answer the page cannot read is a failed read.
 */
export function signInMethodsQuery() {
	return queryOptions({
		queryKey: authQueryKeys.signInMethods(),
		queryFn: async ({ signal }) => {
			const facts = mapSignInMethods(
				await httpSessionGet<SignInMethodsView>(SIGN_IN_METHODS_PATH, { signal })
			);
			if (!facts) throw new Error('The sign-in methods could not be read');
			return facts;
		},
		meta: personalQueryMeta
	});
}

/**
 * «Αποσύνδεση» of a provider (`POST /auth/sign-in-methods/me/providers/:provider/unlink`, D-W45-38): the body is empty
 * by contract — the account is the cookies', the provider one of the closed list. Nothing of the answer leaves `api/`.
 */
export async function unlinkSignInProvider(provider: SignInProviderId): Promise<void> {
	const body: ApiRequestBody<'unlinkMySignInProvider'> = {};
	await httpSessionPost<unknown>(
		`${SIGN_IN_METHODS_PATH}/providers/${encodeURIComponent(provider)}/unlink`,
		{ body }
	);
}

/**
 * Why a provider was not unlinked (the server's table, `w45-b3`): it would leave the account with no way in
 * (D-W45-38), it is linked no more (a second press, another device), too many tries, the session — else «it did not
 * go through», with no detail.
 */
export type ProviderUnlinkFailure = 'refused' | 'gone' | 'rate-limited' | 'session' | 'unknown';

const SESSION_REFUSED_ERROR_CODE = 'EC401';
// 🔴 D-W45-38: the refusal's reason travels in its message (a refusal has no `data`).
const UNLINK_REFUSED = /SIGN_IN_PROVIDER_UNLINK_REFUSED:NO_OTHER_SIGN_IN\b/u;

/**
 * A refused unlink, by the server's own code. Only `EC401`, the session gate's refusal, means the session is gone; the
 * SAME `403` without the refusal's words is not the block of D-W45-38.
 */
export function readProviderUnlinkFailure(error: unknown): ProviderUnlinkFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.status === 401 && error.errorCode === SESSION_REFUSED_ERROR_CODE) return 'session';
	if (error.status === 403 && UNLINK_REFUSED.test(error.message)) return 'refused';
	if (error.status === 404) return 'gone';
	if (error.status === 429) return 'rate-limited';
	return 'unknown';
}

import { ApiError, httpSessionGet, httpSessionPut } from '$shared/lib/http';
import type {
	AccountGender,
	AccountLocale,
	AccountProfileView,
	AccountWriteFailure
} from './types';

/** The signed-in account's profile (`GET /user/me`), with the cookies: `null` is an account with no profile yet. */
export function getAccountProfile(signal?: AbortSignal): Promise<AccountProfileView> {
	return httpSessionGet<AccountProfileView>('/user/me', { signal });
}

/**
 * 🔴 D-W45-06: the language of every message the account receives from now on (`PUT /user/me`, `locale` ALONE — the
 * body is a patch; for an account with no profile yet the call creates it). A write that changes nothing is a `422`,
 * so the caller sends it only when the language differs. The answer — the whole profile — never leaves `api/` (U-169).
 */
export async function updateAccountLocale(
	locale: AccountLocale,
	signal?: AbortSignal
): Promise<void> {
	await httpSessionPut<unknown>('/user/me', { body: { locale }, signal });
}

/**
 * Wave 4.5 · screen 58 («Φύλο»): the account's gender (`PUT /user/me`, `gender` ALONE — a patch; it cannot be emptied).
 * A write that changes nothing is a `422`, so the caller sends it only when the gender differs. The answer never
 * leaves `api/` (U-169).
 */
export async function updateAccountGender(gender: AccountGender): Promise<void> {
	await httpSessionPut<unknown>('/user/me', { body: { gender } });
}

/**
 * Wave 4.5 · screen 58, an account WITHOUT a patient profile (a doctor's): its date of birth, as an instant of that day
 * (`PUT /user/me`, `dateOfBirth` alone). A patient's goes through the patient's own write (`PATCH /patient/me/profile`).
 */
export async function updateAccountBirthDate(dateOfBirth: string): Promise<void> {
	await httpSessionPut<unknown>('/user/me', { body: { dateOfBirth } });
}

/** Why such a write was refused: the session (`401`), the date of birth the `422` names, another field, else. */
export function readAccountWriteFailure(error: unknown): AccountWriteFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.status === 401) return 'session';
	if (error.status === 422 && /\bdateOfBirth\b/u.test(error.message)) return 'birth-date';
	if (error.status === 400 || error.status === 422) return 'invalid';
	return 'unknown';
}

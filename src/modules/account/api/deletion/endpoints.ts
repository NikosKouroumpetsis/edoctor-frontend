import type { ApiResponseData } from '$shared/lib/api-client';
import { ApiError, httpSessionGet, httpSessionPost } from '$shared/lib/http';
import { mapDeletionCodeSent, mapDeletionPreview } from './map';
import type { DeletionCodeSent, DeletionPreviewFacts } from './types';

const DELETION_PATH = '/auth/account-deletion/me';

/**
 * What deleting the signed-in account would do (`GET /auth/account-deletion/me`, with the cookies): nothing is changed
 * or sent. An answer that is no preview is a failure of the read, never an empty page.
 */
export async function previewDeletion(signal?: AbortSignal): Promise<DeletionPreviewFacts> {
	const facts = mapDeletionPreview(
		await httpSessionGet<ApiResponseData<'previewAccountDeletion', 200>>(DELETION_PATH, { signal })
	);
	if (!facts) throw new ApiError('Not a deletion preview', 0, DELETION_PATH);
	return facts;
}

/**
 * Sends the deletion's code to the account's own verified channel (`POST …/start`). 🔴 The body is EMPTY by contract:
 * the account is the session's, so nothing here can name another account or another address.
 */
export async function startDeletion(): Promise<DeletionCodeSent | null> {
	return mapDeletionCodeSent(
		await httpSessionPost<ApiResponseData<'startAccountDeletion', 200>>(`${DELETION_PATH}/start`, {
			body: {}
		})
	);
}

/**
 * Deletes the signed-in account with the code (`POST …/confirm`, the code in the BODY — 🔴 U-65.6: never an address).
 * A success clears the session's cookies; nothing of the answer is kept.
 */
export async function confirmDeletion(code: string, signal?: AbortSignal): Promise<void> {
	await httpSessionPost<ApiResponseData<'confirmAccountDeletion', 200>>(
		`${DELETION_PATH}/confirm`,
		{ body: { code }, signal }
	);
}

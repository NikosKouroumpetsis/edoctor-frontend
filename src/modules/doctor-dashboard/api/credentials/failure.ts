import { ApiError } from '$shared/lib/http';
import type { DoctorCredentialsFailure } from './types';

/**
 * A save that was NOT sent: on the server's last answer the row is no longer there (`gone`), or the group already
 * holds its twenty (`full`).
 */
export class DoctorCredentialRefusal extends Error {
	readonly reason: 'gone' | 'full';

	constructor(reason: 'gone' | 'full') {
		super(`The biography was not saved: ${reason}`);
		this.name = 'DoctorCredentialRefusal';
		this.reason = reason;
	}
}

/**
 * 🔴 D-W52-63 (`w52-b5` §2): why a save of a group did not happen, read from the refusal of the change itself or from
 * the server's status — `422` a group it will not take (a year past its clock, a title with nothing left, a language
 * that is not Greek), `409` a write that met another, `429` too many, `403` no licence. Anything else is `unknown`:
 * the page keeps what was typed and says the save did not happen.
 */
export function readDoctorCredentialsFailure(error: unknown): DoctorCredentialsFailure {
	if (error instanceof DoctorCredentialRefusal) return error.reason;
	if (!(error instanceof ApiError)) return 'unknown';
	const { status } = error;
	if (status === 401) return 'session';
	if (status === 403) return 'forbidden';
	if (status === 409) return 'conflict';
	if (status === 422) return 'invalid';
	if (status === 429) return 'rate-limited';
	return 'unknown';
}

import { ApiError } from '$shared/lib/http';
import type { DeletionFailureKind } from './types';

const SESSION_REFUSED_ERROR_CODE = 'EC401';
const NO_CHANNEL_ERROR_CODE = 'SIGN_IN_NOT_AVAILABLE';
const FORBIDDEN_ERROR_CODE = 'EC403';
const LOCKED_ERROR_CODES = ['USER_LOCKED', 'EC008'];
// «No challenge is open»: a code that expired, or one already spent — neither is a typo.
const STALE_CODE_ERROR_CODES = ['EC007', 'EC009'];
const INVALID_CODE_ERROR_CODES = ['EC011', 'EC010'];

/**
 * A refused call of the deletion, by the server's own code (the application's `readAccountDeletionFailure`). A `401`
 * alone says nothing — a wrong code and an account without a channel are `401` too — so only `EC401`, the session
 * gate's refusal, means the session is gone. A lost request or an outage decided nothing.
 */
export function readDeletionFailure(error: unknown): DeletionFailureKind {
	if (!(error instanceof ApiError)) return 'unknown';
	const code = error.errorCode;
	if (error.status === 401 && code === SESSION_REFUSED_ERROR_CODE) return 'session-ended';
	if (code === NO_CHANNEL_ERROR_CODE) return 'no-channel';
	if (error.status === 403 && code === FORBIDDEN_ERROR_CODE) return 'backoffice';
	if (error.status === 0 || error.status >= 500) return 'unreachable';
	if (code && LOCKED_ERROR_CODES.includes(code)) return 'locked';
	if (error.status === 429) return 'rate-limited';
	if (code && STALE_CODE_ERROR_CODES.includes(code)) return 'stale-code';
	return code && INVALID_CODE_ERROR_CODES.includes(code) ? 'invalid-code' : 'unknown';
}

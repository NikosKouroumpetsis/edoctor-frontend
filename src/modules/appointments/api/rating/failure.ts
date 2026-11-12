import { ApiError } from '$shared/lib/http';
import { RATING_SUBMIT_BLOCKERS } from './map';
import type { RatingFailureFacts, RatingSubmitBlocker } from './types';

const BLOCKERS = Object.keys(RATING_SUBMIT_BLOCKERS) as RatingSubmitBlocker[];
const named = (message: string, token: string) => new RegExp(`\\b${token}\\b`, 'u').test(message);

/**
 * 🔴 Why the invitation's read or the submit was refused (the application's `readRatingSubmitFailure`): the session
 * (`401`), too many writes (`429`), a submit blocker named in the `403`'s message, the one `403` of an invitation that
 * is not this account's (`not-accessible`, never told apart from one that does not exist), a second review (`409`), a
 * field or the text's `<` `>` (`400` / `422`); anything nobody decided stays `unknown`.
 */
export function readRatingFailure(error: unknown): RatingFailureFacts {
	if (!(error instanceof ApiError)) return { kind: 'unknown', status: 0, blocker: null };
	const { status, message } = error;
	if (status === 401) return { kind: 'session', status, blocker: null };
	if (status === 429) return { kind: 'rate-limited', status, blocker: null };
	if (status === 409) return { kind: 'already-rated', status, blocker: null };
	if (status === 403 || status === 404) {
		const blocker = BLOCKERS.find((code) => named(message, code)) ?? null;
		return { kind: blocker ? 'blocked' : 'not-accessible', status, blocker };
	}
	if (status === 400 || status === 422) return { kind: 'invalid', status, blocker: null };
	return { kind: 'unknown', status, blocker: null };
}

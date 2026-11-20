import { ApiError } from '$shared/lib/http';
import type { DoctorArticlesFailure } from './types';

/**
 * 🔴 D-W52-95 / 99 / 100 (`w52-b9a` §11, `w52-b9b` §1–§2): why a call of screen 85 was refused, read from the status, the
 * server's code and its `details` — `401` the session, `429` the rate, every `403` / `404` an article no longer the
 * doctor's to reach (D-107: another's and an unknown one read alike); a `409` of the 50 the limit, of the uploads the
 * waiting images, any other `409` a state that changed since it was read; a `422` naming a field `REQUIRED` the three
 * of a sending, `ARTICLE_CONTENT_REFUSED` the text, `IMAGE_TOO_SMALL` the cover, any other `422` words the server would
 * not take; a `413` a body too large. Anything else is `unknown`: what was written stays.
 */
export function readDoctorArticlesFailure(error: unknown): DoctorArticlesFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const { status, message } = error;
	const said = `${message} ${error.errorCode ?? ''}`;
	if (status === 401) return 'session';
	if (status === 429) return 'rate-limited';
	if (status === 403 || status === 404) return 'gone';
	if (status === 413) return 'too-large';
	if (status === 409) {
		if (/ARTICLE_UNPUBLISHED_LIMIT_REACHED/u.test(said)) return 'limit';
		if (/ARTICLE_IMAGE_PENDING_LIMIT_REACHED/u.test(said)) return 'images-pending';
		return 'changed';
	}
	if (status === 422) {
		const details = error.details ?? {};
		if (['title', 'shortDescription', 'content'].some((field) => details[field] === 'REQUIRED'))
			return 'required';
		if (/IMAGE_TOO_SMALL/u.test(said)) return 'cover-small';
		if (/ARTICLE_CONTENT_REFUSED/u.test(said) || typeof details.content === 'string')
			return 'content';
		return 'invalid';
	}
	return 'unknown';
}

import { ApiError } from '$shared/lib/http';
import type { NotificationInboxFailure } from './types';

/**
 * Why «read» was not kept: a `401` is a session that ended (U-84); a `404` a line that is not this account's to read
 * (unknown, another's, not shown yet, older than 90 days — one answer, no telling apart); anything else the same way.
 */
export function readNotificationInboxFailure(error: unknown): NotificationInboxFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.status === 401) return 'session';
	return error.status === 404 ? 'gone' : 'unknown';
}

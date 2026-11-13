import { ApiError } from '$shared/lib/http';
import type { NotificationPreferenceFailure } from './types';

/** Why a switch was not saved: a `401` is a session that ended (U-84), anything else is told the same way. */
export function readNotificationPreferenceFailure(error: unknown): NotificationPreferenceFailure {
	return error instanceof ApiError && error.status === 401 ? 'session' : 'unknown';
}

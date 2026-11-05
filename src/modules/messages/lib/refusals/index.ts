import { ApiError } from '$shared/lib/http';

/**
 * What a refused write means to the person writing. The server's code travels in the error's message
 * («Already exist: MESSAGING_CLOSED»); its words never reach the screen, ours do.
 */
export type MessagingRefusal =
	| 'session'
	| 'not-patient'
	| 'closed'
	| 'blocked'
	| 'pre-reply'
	| 'new-limit'
	| 'send-limit'
	| 'duplicate'
	| 'report-limit'
	| 'export-limit'
	| 'already-reported'
	| 'empty'
	| 'too-long'
	| 'gone'
	| 'failed';

const CODES: readonly (readonly [string, MessagingRefusal])[] = [
	['MESSAGING_CLOSED', 'closed'],
	['MESSAGING_BLOCKED', 'blocked'],
	['MESSAGING_PRE_REPLY_LIMIT', 'pre-reply'],
	['MESSAGING_NEW_LIMIT', 'new-limit'],
	['MESSAGING_SEND_LIMIT', 'send-limit'],
	['MESSAGE_DUPLICATE', 'duplicate'],
	['MESSAGING_REPORT_LIMIT', 'report-limit'],
	['MESSAGING_EXPORT_LIMIT', 'export-limit'],
	['MESSAGE_ALREADY_REPORTED', 'already-reported'],
	['MESSAGE_EMPTY', 'empty'],
	['MESSAGE_TOO_LONG', 'too-long']
];

/** Anything but a refusal this page knows (no network, a server's failure) is `failed`: the words stay, to try again. */
export function readMessagingRefusal(error: unknown): MessagingRefusal {
	if (!(error instanceof ApiError)) return 'failed';
	const coded = CODES.find(([code]) => error.message.includes(code));
	if (coded) return coded[1];
	if (error.status === 401) return 'session';
	if (error.status === 403) return 'not-patient';
	if (error.status === 404) return 'gone';
	if (error.status === 422) return 'too-long';
	if (error.status === 429) return 'send-limit';
	return 'failed';
}

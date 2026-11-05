import { describe, expect, it } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { readMessagingRefusal } from '.';

const refused = (status: number, message = 'x') => new ApiError(message, status, '/messaging');

describe('what a refusal means (U-84)', () => {
	it.each([
		['Already exist: MESSAGING_CLOSED', 409, 'closed'],
		['Already exist: MESSAGING_BLOCKED', 409, 'blocked'],
		['Already exist: MESSAGING_PRE_REPLY_LIMIT', 409, 'pre-reply'],
		['Too many: MESSAGING_NEW_LIMIT', 429, 'new-limit'],
		['Too many: MESSAGE_DUPLICATE', 429, 'duplicate'],
		['Invalid input: MESSAGE_EMPTY', 400, 'empty'],
		['Invalid input: MESSAGE_TOO_LONG', 400, 'too-long']
	] as const)('%s', (message, status, kind) => {
		expect(readMessagingRefusal(refused(status, message))).toBe(kind);
	});

	it('by status when no code came', () => {
		expect(readMessagingRefusal(refused(401))).toBe('session');
		expect(readMessagingRefusal(refused(403))).toBe('not-patient');
		expect(readMessagingRefusal(refused(404))).toBe('gone');
		expect(readMessagingRefusal(refused(429))).toBe('send-limit');
		expect(readMessagingRefusal(refused(422))).toBe('too-long');
	});

	it('no network or a server’s failure: to try again', () => {
		expect(readMessagingRefusal(refused(0))).toBe('failed');
		expect(readMessagingRefusal(refused(500))).toBe('failed');
		expect(readMessagingRefusal(new Error('x'))).toBe('failed');
	});
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import {
	readBookingPhoneFailure,
	readPhoneChangeFailure,
	startBookingPhone,
	verifyBookingPhone
} from '.';

afterEach(() => vi.unstubAllGlobals());

const ok = (data: unknown) =>
	vi.fn(async () => new Response(JSON.stringify({ status: 'ok', data }), { status: 200 }));

describe('the mobile the booking needs (record §3.3)', () => {
	it('starts the challenge with the number and reads «already verified»', async () => {
		const spy = ok({ channel: 'phone', alreadyVerified: true });
		vi.stubGlobal('fetch', spy);
		await expect(startBookingPhone('+306912345678')).resolves.toEqual({ alreadyVerified: true });
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/auth/login-phone/me/start');
		expect(JSON.parse(String(init.body))).toEqual({ mobilePhone: '+306912345678' });
	});

	it('verifies the code', async () => {
		const spy = ok({ tenantUser: {} });
		vi.stubGlobal('fetch', spy);
		await verifyBookingPhone('123456');
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/auth/login-phone/me/verify');
		expect(JSON.parse(String(init.body))).toEqual({ code: '123456' });
	});

	it('reads a refusal: another account’s number, a wrong or spent code, a lock, too many tries, the session', () => {
		expect(readBookingPhoneFailure(new ApiError('taken', 409, '/x'))).toBe('number-taken');
		expect(readBookingPhoneFailure(new ApiError('bad', 400, '/x', 'EC011'))).toBe('invalid-code');
		expect(readBookingPhoneFailure(new ApiError('old', 400, '/x', 'EC007'))).toBe('stale-code');
		expect(readBookingPhoneFailure(new ApiError('lock', 423, '/x', 'USER_LOCKED'))).toBe('locked');
		expect(readBookingPhoneFailure(new ApiError('slow', 429, '/x'))).toBe('rate-limited');
		expect(readBookingPhoneFailure(new ApiError('no', 401, '/x'))).toBe('session');
		expect(readBookingPhoneFailure('x')).toBe('unknown');
	});

	it('🔴 w45-w5 (negative): the server refuses a wrong or spent code with a `401` — never read as a session that ended', () => {
		expect(readBookingPhoneFailure(new ApiError('bad', 401, '/x', 'EC011'))).toBe('invalid-code');
		expect(readBookingPhoneFailure(new ApiError('old', 401, '/x', 'EC007'))).toBe('stale-code');
		expect(readBookingPhoneFailure(new ApiError('old', 401, '/x', 'EC009'))).toBe('stale-code');
		expect(readBookingPhoneFailure(new ApiError('lock', 401, '/x', 'EC008'))).toBe('locked');
		expect(readBookingPhoneFailure(new ApiError('no', 401, '/x', 'EC401'))).toBe('session');
	});
});

describe('wave 4.5 · screen 58 «Κινητό»: the change’s own reading of a refusal', () => {
	const refusal = (status: number, code?: string) =>
		new ApiError('refused', status, '/auth/login-phone/me/verify', code);

	it.each([
		[409, undefined, 'taken'],
		[400, 'EC400', 'invalid-value'],
		[422, 'EC423', 'invalid-value'],
		[401, 'EC011', 'invalid-code'],
		[401, 'EC007', 'stale-code'],
		[401, 'EC009', 'stale-code'],
		[429, 'EC429', 'rate-limited'],
		[401, 'EC401', 'session'],
		[403, 'USER_LOCKED', 'unknown'],
		[401, 'EC008', 'unknown'],
		[401, 'SIGN_IN_NOT_AVAILABLE', 'unknown'],
		[500, undefined, 'unknown']
	] as const)('reads %s %s as «%s»', (status, code, kind) => {
		expect(readPhoneChangeFailure(refusal(status, code))).toBe(kind);
	});

	it('🔴 (negative) a wrong code is a `401` too: only `EC401` is a session that ended', () => {
		expect(readPhoneChangeFailure(refusal(401))).toBe('unknown');
		expect(readPhoneChangeFailure(refusal(401, 'EC011'))).not.toBe('session');
		expect(readPhoneChangeFailure('x')).toBe('unknown');
	});
});

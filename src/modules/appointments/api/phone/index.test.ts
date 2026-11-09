import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { readBookingPhoneFailure, startBookingPhone, verifyBookingPhone } from '.';

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
});

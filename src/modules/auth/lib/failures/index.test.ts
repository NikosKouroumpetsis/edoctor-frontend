import { describe, expect, it } from 'vitest';
import { ApiError } from '$shared/lib/http';
import {
	isAlreadyOnboarded,
	isBirthDateRefusal,
	isRateLimited,
	isSpentTicket,
	readAccountPasswordFailure,
	readOtpFailure,
	readPasswordFailure,
	readSetPasswordCodeRejection
} from '.';

const refusal = (status: number, code?: string, message = 'x') =>
	new ApiError(message, status, '/u', code);

// 🔴 Π6 (ισοτιμία app = web): the backend's codes, read as `application/src/modules/auth/lib/otp` reads them.
describe('auth::lib::failures (app = web)', () => {
	it('a refused code', () => {
		expect(readOtpFailure(refusal(400, 'EC011'))).toBe('invalid-code');
		expect(readOtpFailure(refusal(400, 'EC010'))).toBe('invalid-code');
		expect(readOtpFailure(refusal(401, 'EC008'))).toBe('locked');
		expect(readOtpFailure(refusal(423, 'USER_LOCKED'))).toBe('locked');
		expect(readOtpFailure(refusal(429))).toBe('rate-limited');
		expect(readOtpFailure(refusal(400, 'EC007'))).toBe('stale-code');
		expect(readOtpFailure(refusal(401, 'SIGN_IN_NOT_AVAILABLE'))).toBe('sign-in-unavailable');
		expect(readOtpFailure(refusal(500))).toBe('unknown');
		expect(readOtpFailure(new Error('x'))).toBe('unknown');
	});

	it('a refused password', () => {
		expect(readPasswordFailure(refusal(401, 'EC412'))).toBe('wrong-credentials');
		expect(readPasswordFailure(refusal(429))).toBe('rate-limited');
		expect(readPasswordFailure(refusal(401, 'SIGN_IN_NOT_AVAILABLE'))).toBe('sign-in-unavailable');
		expect(readPasswordFailure(refusal(0))).toBe('unknown');
	});

	it('the rest of the flow’s refusals', () => {
		expect(isRateLimited(refusal(429))).toBe(true);
		expect(isSpentTicket(refusal(400, 'EC016'))).toBe(true);
		expect(isSpentTicket(refusal(400, 'EC011'))).toBe(false);
		expect(isBirthDateRefusal(refusal(422, undefined, 'dateOfBirth is not valid'))).toBe(true);
		expect(isBirthDateRefusal(refusal(422, undefined, 'email is not valid'))).toBe(false);
		expect(isAlreadyOnboarded(refusal(409, 'EC415'))).toBe(true);
		expect(isAlreadyOnboarded(refusal(409, 'EC999'))).toBe(false);
		expect(readSetPasswordCodeRejection(refusal(400, 'EC011'))).toBe('invalid');
		expect(readSetPasswordCodeRejection(refusal(401, 'EC008'))).toBe('locked');
		expect(readSetPasswordCodeRejection(refusal(400, 'EC009'))).toBe('stale');
		expect(readSetPasswordCodeRejection(refusal(400))).toBeNull();
	});
});

// Wave 4.5 · screen 59: the account's own password — the change, the code's send, the set — by the server's codes
// (`backend/src/shared/vendor/errors.ts`: every one of them but the lock and the limit is a `401`).
describe('auth::lib::failures · the account’s own password (wave 4.5, screen 59)', () => {
	it('each refusal by its code', () => {
		expect(readAccountPasswordFailure(refusal(401, 'EC401'))).toBe('session');
		expect(readAccountPasswordFailure(refusal(401, 'EC412'))).toBe('wrong-password');
		expect(readAccountPasswordFailure(refusal(401, 'EC011'))).toBe('invalid-code');
		expect(readAccountPasswordFailure(refusal(401, 'EC010'))).toBe('invalid-code');
		expect(readAccountPasswordFailure(refusal(401, 'EC007'))).toBe('stale-code');
		expect(readAccountPasswordFailure(refusal(401, 'EC009'))).toBe('stale-code');
		expect(readAccountPasswordFailure(refusal(401, 'EC008'))).toBe('locked');
		expect(readAccountPasswordFailure(refusal(403, 'USER_LOCKED'))).toBe('locked');
		expect(readAccountPasswordFailure(refusal(401, 'SIGN_IN_NOT_AVAILABLE'))).toBe('unavailable');
		expect(readAccountPasswordFailure(refusal(429, 'EC429'))).toBe('rate-limited');
		expect(readAccountPasswordFailure(refusal(404, 'EC404'))).toBe('no-password');
		expect(readAccountPasswordFailure(refusal(422, 'EC423'))).toBe('invalid-value');
		expect(readAccountPasswordFailure(refusal(400))).toBe('invalid-value');
		expect(readAccountPasswordFailure(refusal(500))).toBe('unknown');
		expect(readAccountPasswordFailure(refusal(0))).toBe('unknown');
		expect(readAccountPasswordFailure(new Error('x'))).toBe('unknown');
	});

	it('🔴 (negative) ONLY `401 EC401` is a session that ended — a wrong current password, a wrong or spent code, a `401` with no code or with another, an `EC401` under another status: none of them', () => {
		for (const code of ['EC412', 'EC011', 'EC010', 'EC007', 'EC009', 'EC008', 'EC411', undefined]) {
			expect(readAccountPasswordFailure(refusal(401, code)), String(code)).not.toBe('session');
		}
		expect(readAccountPasswordFailure(refusal(401, 'SIGN_IN_NOT_AVAILABLE'))).not.toBe('session');
		expect(readAccountPasswordFailure(refusal(403, 'EC401'))).not.toBe('session');
		expect(readAccountPasswordFailure(refusal(401))).toBe('unknown');
	});
});

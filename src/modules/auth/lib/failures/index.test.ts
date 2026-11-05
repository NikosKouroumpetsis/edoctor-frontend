import { describe, expect, it } from 'vitest';
import { ApiError } from '$shared/lib/http';
import {
	isAlreadyOnboarded,
	isBirthDateRefusal,
	isRateLimited,
	isSpentTicket,
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

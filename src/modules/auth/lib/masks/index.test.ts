import { describe, expect, it } from 'vitest';
import { channelOf, maskEmail, maskIdentifier, maskPhone } from '.';

// 🔴 Π6 (ισοτιμία app = web): `application/src/modules/auth/lib/{known-account,identifier}`.
describe('auth::lib::masks (app = web)', () => {
	it('an address keeps its first and last characters; a short one its first; none stays as it is', () => {
		expect(maskEmail('kouros@gmail.com')).toBe('k***s@gmail.com');
		expect(maskEmail('ab@gmail.com')).toBe('a***@gmail.com');
		expect(maskEmail('@gmail.com')).toBe('@gmail.com');
	});

	it('a number keeps its last three digits', () => {
		expect(maskPhone('+306971234567')).toBe('***567');
		expect(maskPhone('12')).toBe('12');
	});

	it('reads either shape', () => {
		expect(maskIdentifier({ email: 'kouros@gmail.com' })).toBe('k***s@gmail.com');
		expect(maskIdentifier({ mobilePhone: '+306971234567' })).toBe('***567');
		expect(channelOf({ email: 'a@b.gr' })).toBe('email');
		expect(channelOf({ mobilePhone: '+30' })).toBe('phone');
	});
});

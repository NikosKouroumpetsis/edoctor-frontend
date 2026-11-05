import { describe, expect, it } from 'vitest';
import { isPhoneDraft, isPhoneEntry, isSameIdentifier, parseIdentifier, readDialCode } from '.';

// 🔴 Π6 (ισοτιμία app = web): the same cases as `application/src/modules/auth/lib/identifier/index.unit.spec.ts`.
describe('auth::lib::identifier (app = web)', () => {
	it('reads an address as the email identifier, lower-cased', () => {
		expect(parseIdentifier('  Maria@Example.COM ')).toEqual({ email: 'maria@example.com' });
	});

	it('composes national digits into E.164 with the selected country, without the trunk zero', () => {
		expect(parseIdentifier('6981139821')).toEqual({ mobilePhone: '+306981139821' });
		expect(parseIdentifier('697 123-4567', '+357')).toEqual({ mobilePhone: '+3576971234567' });
		expect(parseIdentifier('06981139821')).toEqual({ mobilePhone: '+306981139821' });
	});

	it('keeps an international prefix the visitor typed; an unlisted one goes as typed', () => {
		expect(parseIdentifier('+30 697 123-4567', '+357')).toEqual({ mobilePhone: '+306971234567' });
		expect(parseIdentifier('00306971234567', '+357')).toEqual({ mobilePhone: '+306971234567' });
		expect(parseIdentifier('+3576971234567')).toEqual({ mobilePhone: '+3576971234567' });
		expect(parseIdentifier('+19175551234')).toEqual({ mobilePhone: '+19175551234' });
	});

	it('recognizes the phone shape from the first digits or a prefix', () => {
		expect(isPhoneEntry('69')).toBe(true);
		expect(isPhoneEntry('+3')).toBe(true);
		expect(isPhoneEntry('6')).toBe(false);
		expect(isPhoneEntry('maria@example.com')).toBe(false);
		expect(isPhoneEntry('mar')).toBe(false);
		expect(isPhoneEntry('')).toBe(false);
		expect(isPhoneDraft('6')).toBe(true);
		expect(isPhoneDraft('+')).toBe(true);
		expect(isPhoneDraft('')).toBe(false);
		expect(isPhoneDraft('69a')).toBe(false);
	});

	it('splits a typed prefix, the longest match first', () => {
		expect(readDialCode('+3576971234')).toEqual({ dialCode: '+357', national: '6971234' });
		expect(readDialCode('00306971234')).toEqual({ dialCode: '+30', national: '6971234' });
		expect(readDialCode('6971234')).toBeNull();
	});

	it('U-65.6 (negative): refuses anything the contract would reject, instead of sending it', () => {
		for (const value of [
			'',
			'   ',
			'maria@',
			'maria@example',
			'12345',
			'not a phone',
			'69a1139821',
			'<img src=x>@a.gr',
			'+3069123456789012',
			'+30 691 234 5678 9012'
		]) {
			expect(parseIdentifier(value), value).toBeNull();
		}
		expect(parseIdentifier('69123456789012', '+30')).toBeNull();
		expect(parseIdentifier('+306912345678901')).toEqual({ mobilePhone: '+306912345678901' });
		expect(parseIdentifier('6912345678901', '+30')).toEqual({ mobilePhone: '+306912345678901' });
	});

	it('the same identifier, whichever shape', () => {
		expect(isSameIdentifier({ email: 'a@b.gr' }, { email: 'a@b.gr' })).toBe(true);
		expect(isSameIdentifier({ email: 'a@b.gr' }, { mobilePhone: '+30' })).toBe(false);
		expect(isSameIdentifier(null, { email: 'a@b.gr' })).toBe(false);
	});
});

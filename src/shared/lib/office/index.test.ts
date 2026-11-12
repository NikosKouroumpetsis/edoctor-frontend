import { describe, expect, it } from 'vitest';
import { officeDialNumber, officeFloorValue, officePhoneLabel } from '.';

describe('shared/lib/office (P-W4 Σ-26: the profile and the appointment say an office the same way)', () => {
	it('the floor in words: «Ισόγειο», «Υπόγειο», «3ος» — a fraction cut to its level', () => {
		expect(officeFloorValue(0, 'el')).toBe('Ισόγειο');
		expect(officeFloorValue(-1, 'el')).toBe('Υπόγειο');
		expect(officeFloorValue(-2, 'el')).toBe('Υπόγειο');
		expect(officeFloorValue(3, 'el')).toBe('3ος');
		expect(officeFloorValue(3.7, 'el')).toBe('3ος');
		expect(officeFloorValue(0, 'en')).toBe('Ground floor');
		expect(officeFloorValue(2, 'en')).toBe('2');
	});

	it('(negative) no floor, or one that is no number, is no words', () => {
		expect(officeFloorValue(undefined, 'el')).toBeUndefined();
		expect(officeFloorValue(Number.NaN, 'el')).toBeUndefined();
		expect(officeFloorValue(Number.POSITIVE_INFINITY, 'en')).toBeUndefined();
	});

	it('the phone for `tel:`: its digits and one leading «+», whatever the server wrote around them', () => {
		expect(officeDialNumber('+30 210 321 0101')).toBe('+302103210101');
		expect(officeDialNumber(' 210-321 0101 ')).toBe('2103210101');
	});

	it('(negative) nothing reaches the dialler but digits: no letters, no `;`, no second «+», no empty number', () => {
		expect(officeDialNumber('+30 210;ext=12,javascript:')).toBe('+3021012');
		expect(officeDialNumber('++30 210')).toBe('+30210');
		expect(officeDialNumber('+')).toBeUndefined();
		expect(officeDialNumber('   ')).toBeUndefined();
		expect(officeDialNumber('κλήση')).toBeUndefined();
		expect(officeDialNumber(undefined)).toBeUndefined();
	});

	it('🔴 D-W4-36.3: the phone as read is the prototype’s «210 321 0101» — the national groups, never folded — whatever the server stored', () => {
		const NBSP = '\u00a0';
		const national = ['210', '321', '0101'].join(NBSP);
		expect(officePhoneLabel('+302103210101')).toBe(national);
		expect(officePhoneLabel('302103210101')).toBe(national);
		expect(officePhoneLabel('+30 210 3210101')).toBe(national);
		expect(officePhoneLabel('2103210101')).toBe(national);
		expect(officePhoneLabel('+306971234567')).toBe(['697', '123', '4567'].join(NBSP));
	});

	it('(negative) a number from elsewhere stays whole with its «+»; only digits survive; none without a digit', () => {
		expect(officePhoneLabel('+447911123456')).toBe('+447911123456');
		expect(officePhoneLabel('+30<b>210</b>3210101')).toBe(['210', '321', '0101'].join('\u00a0'));
		expect(officePhoneLabel('κλήση')).toBeUndefined();
		expect(officePhoneLabel('   ')).toBeUndefined();
		expect(officePhoneLabel(undefined)).toBeUndefined();
	});
});

import { describe, expect, it } from 'vitest';
import {
	mobilePhoneLine,
	officeAddressLine,
	officeDialNumber,
	officeFloorLine,
	officeFloorValue,
	officePhoneLabel,
	officePhoneLine,
	type OfficeAddress
} from '.';

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

const NBSP = '\u00a0';
const office: OfficeAddress = {
	street: 'Ερμού',
	streetNumber: '101',
	city: 'Αθήνα',
	state: 'Αττική',
	floor: 2,
	translations: [
		{
			language: 'en',
			street: 'Ermou',
			streetNumber: '101',
			city: 'Athens',
			state: 'Attica',
			floor: null
		}
	]
};

describe('shared/lib/office · D-W51-37: an appointment’s office and phones, the 51’s and the 68’s one way', () => {
	it('the line in the page’s language, the floor in words («2ος όροφος», «Ισόγειο»)', () => {
		expect(officeAddressLine(office, 'el')).toBe('Ερμού 101, Αθήνα, Αττική');
		expect(officeAddressLine(office, 'en')).toBe('Ermou 101, Athens, Attica');
		expect(officeFloorLine(office, 'el')).toBe('2ος όροφος');
		expect(officeFloorLine({ ...office, floor: 0 }, 'el')).toBe('Ισόγειο');
		expect(officeFloorLine({ ...office, floor: -1 }, 'el')).toBe('Υπόγειο');
	});

	it('(negative) a half translation is not taken; no floor is no line; an empty part is never joined', () => {
		const half = {
			...office,
			translations: [{ ...office.translations[0], city: null }]
		};
		expect(officeAddressLine(half, 'en')).toBe('Ερμού 101, Αθήνα, Αττική');
		expect(officeFloorLine({ ...office, floor: null }, 'el')).toBeNull();
		expect(
			officeAddressLine({ ...office, street: null, state: null, translations: [] }, 'el')
		).toBe('101, Αθήνα');
	});

	it('the office’s phone as read and dialled; none without a digit', () => {
		expect(officePhoneLine('302103210101')).toEqual({
			label: ['210', '321', '0101'].join(NBSP),
			dial: '302103210101'
		});
		expect(officePhoneLine('κλήση;')).toBeNull();
		expect(officePhoneLine(null)).toBeNull();
	});

	it('🔴 U-182.7: a person’s mobile whole, «+30 697 765 4321», dialled with its country', () => {
		expect(mobilePhoneLine('306977654321')).toEqual({
			label: ['+30', '697', '765', '4321'].join(NBSP),
			dial: '+306977654321'
		});
		expect(mobilePhoneLine('+30 697 765 4321')?.dial).toBe('+306977654321');
		expect(mobilePhoneLine('6977654321')?.dial).toBe('+306977654321');
		expect(mobilePhoneLine('447911123456')).toEqual({
			label: '+447911123456',
			dial: '+447911123456'
		});
	});

	it('(negative, U-65.6) only digits reach the page and the dialler; nothing without one', () => {
		expect(mobilePhoneLine('30<b>697</b>7654321;javascript:')?.dial).toBe('+306977654321');
		expect(mobilePhoneLine('κλήση')).toBeNull();
		expect(mobilePhoneLine('')).toBeNull();
		expect(mobilePhoneLine(undefined)).toBeNull();
	});
});

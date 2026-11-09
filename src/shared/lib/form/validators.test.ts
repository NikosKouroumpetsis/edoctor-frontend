import { describe, expect, it } from 'vitest';
import { AFM_LENGTH, AMKA_LENGTH, Validators, greekIdDigits, runValidators } from './validators';

describe('Validators', () => {
	it('required rejects empty strings, arrays and nullish', () => {
		expect(Validators.required('')).toEqual({ required: true });
		expect(Validators.required('   ')).toEqual({ required: true });
		expect(Validators.required([])).toEqual({ required: true });
		expect(Validators.required(null)).toEqual({ required: true });
		expect(Validators.required('x')).toBeNull();
		expect(Validators.required(['a'])).toBeNull();
	});

	it('email validates format and ignores empty (let required own emptiness)', () => {
		expect(Validators.email('a@b.gr')).toBeNull();
		expect(Validators.email('nope')).toEqual({ email: true });
		expect(Validators.email('')).toBeNull();
	});

	it('minLength / maxLength', () => {
		expect(Validators.minLength(3)('ab')).toEqual({ minLength: true });
		expect(Validators.minLength(3)('abc')).toBeNull();
		expect(Validators.maxLength(3)('abcd')).toEqual({ maxLength: true });
	});

	it('passwordStrength enforces upper, lower and digit/symbol', () => {
		expect(Validators.passwordStrength('abc')).toEqual({ passwordStrength: true });
		expect(Validators.passwordStrength('Abc1')).toBeNull();
	});

	it('runValidators merges all failing keys', () => {
		const result = runValidators('a', [
			Validators.required,
			Validators.minLength(3),
			Validators.email
		]);
		expect(result).toEqual({ minLength: true, email: true });
	});

	it('runValidators returns null when all pass', () => {
		expect(runValidators('abc', [Validators.required, Validators.minLength(2)])).toBeNull();
	});

	it('U-121.2: lettersOnly takes one word of Latin or Greek letters once trimmed, and leaves emptiness to required', () => {
		for (const value of ['Anna', ' Παππά ', 'ΆΝΝΑ', 'Ἀλέξανδρος', 'Ευαγγελία', 'x']) {
			expect(Validators.lettersOnly(value), value).toBeNull();
		}
		expect(Validators.lettersOnly('')).toBeNull();
		expect(Validators.lettersOnly('   ')).toBeNull();
		expect(Validators.lettersOnly(null)).toBeNull();
	});

	it('U-121.2 (negative): lettersOnly refuses a space, a hyphen, an apostrophe, a digit, markup, another script, an emoji, a NUL', () => {
		for (const value of [
			'Κύματος Τρία',
			'Anna-Maria',
			"O'Brien",
			'O’Brien',
			'Anna2',
			'<b>Anna</b>',
			'Анна',
			'آنا',
			'Anna🙂',
			'An\u0000na',
			'Άννα\u0301'
		]) {
			expect(Validators.lettersOnly(value), value).toEqual({ lettersOnly: true });
		}
	});

	it('U-121.3: amkaDate takes an ΑΜΚΑ whose first four digits are a real day and month — 29 February too', () => {
		// Synthetic numbers only: a date of the rule's, and a last digit that fails Luhn (w3-w9 r1 MINOR-2: no person's).
		for (const value of ['01019012345', '29029012345', '30049012345', '31129012346']) {
			expect(Validators.amkaDate(value), value).toBeNull();
		}
	});

	it('U-121.3 (negative): amkaDate refuses day 0 or 32, month 0 or 13, 30 February, 31 April; another shape is pattern’s', () => {
		for (const value of [
			'00019012345',
			'32019012345',
			'01009012345',
			'01139012345',
			'30029012345',
			'31049012345',
			'99999999999'
		]) {
			expect(Validators.amkaDate(value), value).toEqual({ amkaDate: true });
		}
		for (const value of ['', null, '0101901234', '010190123456', '0101901234a', ' 01019012345']) {
			expect(Validators.amkaDate(value), String(value)).toBeNull();
		}
	});

	it('U-121.3: afmCheckDigit takes an ΑΦΜ that ends with the check digit of its first eight — a remainder of 10 is 0', () => {
		// Synthetic numbers only, the check digit computed by the rule: 12345678 ⇒ 3, 11111111 ⇒ 4, 88888888 ⇒ 10 ⇒ 0.
		for (const value of ['000000000', '123456783', '111111114', '888888880']) {
			expect(Validators.afmCheckDigit(value), value).toBeNull();
		}
	});

	it('U-121.3 (negative): afmCheckDigit refuses a wrong check digit; another shape is pattern’s', () => {
		for (const value of ['123456789', '111111111', '888888881', '000000001']) {
			expect(Validators.afmCheckDigit(value), value).toEqual({ afmCheckDigit: true });
		}
		for (const value of ['', null, '12345678', '1234567830', '12345678a']) {
			expect(Validators.afmCheckDigit(value), String(value)).toBeNull();
		}
	});

	it('W9 Delta 1 · NIT-2: greekIdDigits reads an id as the server does — its digits 0–9 alone, trimmed; the ONE length of each', () => {
		expect(greekIdDigits(' 3002 9012340 ')).toBe('30029012340');
		expect(greekIdDigits('EL 123-456 783')).toBe('123456783');
		expect(greekIdDigits(null)).toBe('');
		expect(greekIdDigits('١٢٣ ０１２')).toBe('');
		expect([AMKA_LENGTH, AFM_LENGTH]).toEqual([11, 9]);
	});

	it('W9 Delta 1 · NIT-2 (negative): amkaDate / afmCheckDigit judge the digits the server keeps — spaces and dashes do not hide a wrong date or check digit', () => {
		expect(Validators.amkaDate(' 3002 9012340 ')).toEqual({ amkaDate: true });
		expect(Validators.amkaDate('2902-9012341')).toBeNull();
		expect(Validators.afmCheckDigit('EL 123 456 789')).toEqual({ afmCheckDigit: true });
		expect(Validators.afmCheckDigit('123-456-783')).toBeNull();
	});
});

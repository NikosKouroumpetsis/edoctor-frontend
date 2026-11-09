import { describe, expect, it } from 'vitest';
import {
	formatPostalCode,
	isDoctorOfAge,
	isSearchableAddressQuery,
	isValidCity,
	isValidContactEmail,
	isValidDoctorName,
	isValidEmailCode,
	isValidLicenseDate,
	isValidLiabilityCompany,
	isValidLicenseNumber,
	isValidPhone,
	isValidPolicyExpiry,
	isValidPostalCode,
	isValidPrice,
	isValidStreetLine,
	keepPostalCodeInput,
	keepPriceInput,
	readAddressQuery,
	readGettingThere,
	readSpecialtyQuery
} from '.';

// 7 November 2026, 12:00 in Athens.
const NOW = Date.parse('2026-11-07T10:00:00.000Z');

describe('doctor-onboarding · lib/validation (U-65.6, the application’s rules)', () => {
	it('≥ 18 (record §6.4) on the platform’s calendar: the 18th birthday today is enough, tomorrow is not', () => {
		expect(isDoctorOfAge('2008-11-07', NOW)).toBe(true);
		expect(isDoctorOfAge('2008-11-08', NOW)).toBe(false);
		expect(isDoctorOfAge('1985-04-12', NOW)).toBe(true);
	});

	it('≥ 18 (negative): a day after today, beyond 120 years, a day the calendar lacks or no date at all', () => {
		for (const day of ['2027-01-01', '1900-01-01', '1990-02-30', '', '12/04/1985', '<script>']) {
			expect(isDoctorOfAge(day, NOW), day).toBe(false);
		}
	});

	it('names 1…100 with no NUL; the street and the town 1…200', () => {
		expect(isValidDoctorName('Μαρία')).toBe(true);
		expect(isValidDoctorName('α'.repeat(100))).toBe(true);
		for (const name of ['', '   ', 'α'.repeat(101), 'Μα\u0000ρία']) {
			expect(isValidDoctorName(name)).toBe(false);
		}
		expect(isValidStreetLine('Καραΐσκου 74')).toBe(true);
		expect(isValidStreetLine('α'.repeat(201))).toBe(false);
		expect(isValidCity('Πειραιάς')).toBe(true);
		expect(isValidCity(' ')).toBe(false);
	});

	it('the email, the code, the license', () => {
		expect(isValidContactEmail(' dr@example.test ')).toBe(true);
		for (const email of ['dr@', 'dr example@test.gr', 'dr@test', `${'a'.repeat(250)}@x.gr`]) {
			expect(isValidContactEmail(email), email).toBe(false);
		}
		expect(isValidEmailCode('123456')).toBe(true);
		for (const code of ['12345', '1234567', '12345a', '١٢٣٤٥٦']) {
			expect(isValidEmailCode(code), code).toBe(false);
		}
		expect(isValidLicenseNumber('')).toBe(true);
		expect(isValidLicenseNumber('12345/2001')).toBe(true);
		expect(isValidLicenseNumber('1'.repeat(51))).toBe(false);
		expect(isValidLicenseDate('', NOW)).toBe(true);
		expect(isValidLicenseDate('2001-06-15', NOW)).toBe(true);
		expect(isValidLicenseDate('2027-06-15', NOW)).toBe(false);
		expect(isValidLicenseDate('2001-02-31', NOW)).toBe(false);
	});

	it('the postal code: digits and a space only, five digits («185 32» or «18532»)', () => {
		expect(isValidPostalCode('185 32')).toBe(true);
		expect(isValidPostalCode('18532')).toBe(true);
		for (const code of ['1853', '185 321', '18 532', 'ΑΒΓ12']) {
			expect(isValidPostalCode(code), code).toBe(false);
		}
		expect(keepPostalCodeInput('18a5 3<2>9')).toBe('185 32');
		expect(formatPostalCode('18532')).toBe('185 32');
		expect(formatPostalCode('1853')).toBe('1853');
	});

	it('U-65.6: the searches are cut at their limits (120, 60) and asked from two letters', () => {
		expect(readAddressQuery('α'.repeat(500))).toHaveLength(120);
		expect(readSpecialtyQuery('β'.repeat(500))).toHaveLength(60);
		expect(isSearchableAddressQuery(' κ ')).toBe(false);
		expect(isSearchableAddressQuery('κα')).toBe(true);
	});
	it('38 · the office phone (the prototype’s, the application’s rule): 10 to 16 digits and spaces, an optional «+»', () => {
		expect(isValidPhone('210 412 3456')).toBe(true);
		expect(isValidPhone(' +30 210 4123456 ')).toBe(true);
		expect(isValidPhone('6912345678')).toBe(true);
	});

	it('38 · U-65.6 (negative): a phone with a letter, too short, too long, a «+» inside, a script or a NUL is none', () => {
		for (const wrong of [
			'',
			'210 41a 3456',
			'210412345',
			'12345678901234567',
			'210+4123456',
			'<script>1</script>',
			'2104123456\u0000'
		]) {
			expect(isValidPhone(wrong), wrong).toBe(false);
		}
	});

	it('38 · U-68.2 / U-65.6 (negative): the directions are cut at 1000 — 1001 characters keep 1000, a short text stays whole', () => {
		expect(readGettingThere('α'.repeat(1001))).toHaveLength(1000);
		expect(readGettingThere('Κουδούνι «Ιατρείο».')).toBe('Κουδούνι «Ιατρείο».');
	});

	it('39 · the price: whole euros, 1 to 9999 — 0, 10000, a sign, a decimal or a letter is none; the field keeps only four digits', () => {
		expect(isValidPrice('1')).toBe(true);
		expect(isValidPrice('60')).toBe(true);
		expect(isValidPrice('9999')).toBe(true);
		for (const wrong of ['', '0', '0000', '10000', '-5', '12.5', '1e3', '５０', ' 50']) {
			expect(isValidPrice(wrong), wrong).toBe(false);
		}
		expect(keepPriceInput('-12.5€a')).toBe('125');
		expect(keepPriceInput('123456')).toBe('1234');
		expect(keepPriceInput('<b>7</b>')).toBe('7');
	});

	it('41 · the optional company (≤ 120, the server’s) and the expiry (a real day, the future allowed); (negative) 121, blanks with a NUL, a day that is none', () => {
		expect(isValidLiabilityCompany('')).toBe(true);
		expect(isValidLiabilityCompany('Ασφαλιστική Α.Ε.')).toBe(true);
		expect(isValidLiabilityCompany('α'.repeat(120))).toBe(true);
		expect(isValidLiabilityCompany('α'.repeat(121))).toBe(false);
		expect(isValidLiabilityCompany(' \u0000 ')).toBe(false);
		expect(isValidPolicyExpiry('')).toBe(true);
		expect(isValidPolicyExpiry('2030-12-31')).toBe(true);
		expect(isValidPolicyExpiry('2020-01-01')).toBe(true);
		expect(isValidPolicyExpiry('2027-02-30')).toBe(false);
		expect(isValidPolicyExpiry('31/12/2030')).toBe(false);
	});
});

import { describe, expect, it } from 'vitest';
import { foldSearchText, toGreekUpperCase } from './index';

describe('toGreekUpperCase', () => {
	it.each([
		['Προσθήκη είδους', 'ΠΡΟΣΘΗΚΗ ΕΙΔΟΥΣ'],
		['Συνέχεια στην πληρωμή', 'ΣΥΝΕΧΕΙΑ ΣΤΗΝ ΠΛΗΡΩΜΗ'],
		['Άκυρο', 'ΑΚΥΡΟ']
	])('U-03.9: takes the tonos off %s', (label, expected) => {
		expect(toGreekUpperCase(label)).toBe(expected);
	});

	it.each([
		['Ευρωπαϊκή', 'ΕΥΡΩΠΑΪΚΗ'],
		['πρωτεΐνη', 'ΠΡΩΤΕΪΝΗ'],
		['ΐ', 'Ϊ'],
		['ΰ', 'Ϋ']
	])('U-03.9: keeps the dialytika of %s', (label, expected) => {
		expect(toGreekUpperCase(label)).toBe(expected);
	});

	it('U-03.9: leaves no combining acute behind', () => {
		expect([...toGreekUpperCase('πρωτεΐνη')].map((character) => character.codePointAt(0))).toEqual([
			0x3a0, 0x3a1, 0x3a9, 0x3a4, 0x395, 0x3aa, 0x39d, 0x397
		]);
	});

	it.each([['Add item'], ['Café'], ['']])('U-03.9: leaves %s untouched', (label) => {
		expect(toGreekUpperCase(label)).toBe(label);
	});

	it('U-03.9: takes the tonos off Greek beside Latin and capitalises the final sigma', () => {
		expect(toGreekUpperCase('Café Παπαδόπουλος')).toBe('CAFÉ ΠΑΠΑΔΟΠΟΥΛΟΣ');
		expect(toGreekUpperCase('είδους')).toBe('ΕΙΔΟΥΣ');
	});
});

describe('foldSearchText', () => {
	it.each([
		['Αθήνα', 'αθηνα'],
		['ΠΕΙΡΑΙΆΣ', 'πειραιασ'],
		['Παιδίατρος', 'παιδιατροσ'],
		['Ευρωπαϊκή', 'ευρωπαικη'],
		['Café', 'cafe']
	])('U-03.1 (K4.4, the application’s fold): %s ⇒ %s', (value, folded) => {
		expect(foldSearchText(value)).toBe(folded);
	});

	it('keeps the length of a precomposed letter at one and does not trim', () => {
		expect(foldSearchText('ά')).toHaveLength(1);
		expect(foldSearchText(' α ')).toBe(' α ');
	});
});

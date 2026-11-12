import { describe, expect, it } from 'vitest';
import {
	clampTextLength,
	foldSearchText,
	highlightSearch,
	matchesSearch,
	searchWords,
	toGreekUpperCase,
	withDoctorTitle
} from './index';

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

describe('withDoctorTitle (U-99.1)', () => {
	it('«Dr.» before a bare name, in Greek or Latin letters', () => {
		expect(withDoctorTitle('Σοφία Ρηγοπούλου')).toBe('Dr. Σοφία Ρηγοπούλου');
		expect(withDoctorTitle('  Athena Papadopoulou ')).toBe('Dr. Athena Papadopoulou');
	});

	it('(negative) a name that already wears its title is not given a second one', () => {
		for (const name of [
			'Dr. Athena',
			'dr. athena',
			'DR Athena',
			'Dr.Athena',
			'Δρ. Μαρία',
			'ΔΡ. ΜΑΡΙΑ',
			'δρ Μαρία'
		]) {
			expect(withDoctorTitle(name)).toBe(name);
		}
	});

	it('(negative) a surname that merely starts with those letters is a name like any other; no name stays no name', () => {
		expect(withDoctorTitle('Drakos Nikos')).toBe('Dr. Drakos Nikos');
		expect(withDoctorTitle('Δρόσος Νίκος')).toBe('Dr. Δρόσος Νίκος');
		expect(withDoctorTitle('   ')).toBe('');
	});
});

describe('clampTextLength (D-W4-36.8: the server counts UTF-16 code units)', () => {
	it('keeps a text within the bound as it is; cuts a longer one to the bound in code units', () => {
		expect(clampTextLength('Πονάει το γόνατο', 500)).toBe('Πονάει το γόνατο');
		expect(clampTextLength('α'.repeat(10_000), 500)).toHaveLength(500);
		expect(clampTextLength('αβγ', 0)).toBe('');
	});

	it('🔴 (negative) an emoji counts as two, as the server counts it, and is never split in half', () => {
		const emoji = '😀'.repeat(300);
		expect(clampTextLength(emoji, 500)).toBe('😀'.repeat(250));
		const odd = clampTextLength(`a${'😀'.repeat(300)}`, 500);
		expect(odd).toHaveLength(499);
		expect(odd.endsWith('😀')).toBe(true);
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

describe('search words and highlight (U-57.3, U-60.1)', () => {
	it('U-57.3 / U-60.1 (app = web): the words are folded — no accents, no case, the final sigma a sigma — and blanks dropped', () => {
		expect(searchWords('  ΠΡΟΛΗΠΤΙΚΟΣ   Έλεγχος ')).toEqual(['προληπτικοσ', 'ελεγχοσ']);
		expect(searchWords('')).toEqual([]);
		expect(searchWords(null)).toEqual([]);
	});

	it('U-57.3 / U-60.1: a text matches when it holds EVERY word, anywhere inside a word, whatever its accents', () => {
		expect(matchesSearch('Προληπτικός έλεγχος (check-up)', searchWords('προλ ελεγ'))).toBe(true);
		expect(matchesSearch('Πώς μπορώ να ακυρώσω το ραντεβού μου;', searchWords('ΡΑΝΤΕΒΟΥ'))).toBe(
			true
		);
		expect(matchesSearch('Πώς μπορώ να ακυρώσω;', searchWords('ραντεβού ακυρώσω'))).toBe(false);
	});

	it('U-57.3: the parts that match are marked in the text as it is written (accents kept)', () => {
		expect(highlightSearch('Αιματολογικές εξετάσεις', searchWords('αιμα εξετ'))).toEqual([
			{ text: 'Αιμα', match: true },
			{ text: 'τολογικές ', match: false },
			{ text: 'εξετ', match: true },
			{ text: 'άσεις', match: false }
		]);
		expect(highlightSearch('Τίποτα', [])).toEqual([{ text: 'Τίποτα', match: false }]);
	});
});

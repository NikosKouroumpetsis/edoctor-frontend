import { describe, expect, it } from 'vitest';
import { relativeNameWithWord, relativeSubject, relativeWordLabel } from '.';

const RELATIONSHIPS = ['CHILD', 'PARENT', 'SIBLING', 'SPOUSE', 'OTHER_RELE'] as const;
const GENDERS = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER_GENE'] as const;

describe('🔴 U-139.5 · the relationship’s word and the article, from relationship + gender (D-W4-22, app = web)', () => {
	it('every relationship × gender of the contract, in Greek', () => {
		const words = RELATIONSHIPS.map((relationship) =>
			GENDERS.map((gender) => relativeWordLabel(relationship, gender, 'el'))
		);
		expect(words).toEqual([
			['Γιος', 'Κόρη', 'Παιδί', 'Παιδί'],
			['Πατέρας', 'Μητέρα', 'Γονέας', 'Γονέας'],
			['Αδελφός', 'Αδελφή', 'Αδελφός/ή', 'Αδελφός/ή'],
			['Σύζυγος', 'Σύζυγος', 'Σύζυγος', 'Σύζυγος'],
			['Άλλη σχέση', 'Άλλη σχέση', 'Άλλη σχέση', 'Άλλη σχέση']
		]);
		expect(relativeWordLabel('CHILD', 'FEMALE', 'en')).toBe('Daughter');
		expect(relativeWordLabel('PARENT', 'MALE', 'en')).toBe('Father');
	});

	it('(negative) a gender empty or unknown reads the neutral word; a relationship this build cannot name reads nothing, never the wire value', () => {
		expect(relativeWordLabel('CHILD', '', 'el')).toBe('Παιδί');
		expect(relativeWordLabel('CHILD', null, 'el')).toBe('Παιδί');
		expect(relativeWordLabel('PARENT', 'female', 'el')).toBe('Γονέας');
		expect(relativeWordLabel('SIBLING', 'constructor', 'el')).toBe('Αδελφός/ή');
		expect(relativeWordLabel('', 'MALE', 'el')).toBe('');
		expect(relativeWordLabel('COUSIN', 'MALE', 'el')).toBe('');
		expect(relativeWordLabel('toString', 'MALE', 'el')).toBe('');
	});

	it('«Ο» / «Η» / «Ο/Η» before the name; the English reads the name alone', () => {
		expect(relativeSubject('Γιώργος Παππάς', 'MALE', 'el')).toBe('Ο Γιώργος Παππάς');
		expect(relativeSubject('Άννα Παππά', 'FEMALE', 'el')).toBe('Η Άννα Παππά');
		for (const gender of ['NON_BINARY', 'OTHER_GENE', '', null, 'X']) {
			expect(relativeSubject('Νίκη Παππά', gender, 'el')).toBe('Ο/Η Νίκη Παππά');
		}
		expect(relativeSubject('Άννα Παππά', 'FEMALE', 'en')).toBe('Άννα Παππά');
	});

	it('«Γιώργος Παππάς (γιος)»: the word after the name, its first letter small; the name alone without a word', () => {
		expect(relativeNameWithWord('Γιώργος Παππάς', 'CHILD', 'MALE', 'el')).toBe(
			'Γιώργος Παππάς (γιος)'
		);
		expect(relativeNameWithWord('Άννα Παππά', 'PARENT', 'FEMALE', 'el')).toBe(
			'Άννα Παππά (μητέρα)'
		);
		expect(relativeNameWithWord('Anna Pappa', 'PARENT', 'FEMALE', 'en')).toBe(
			'Anna Pappa (mother)'
		);
		expect(relativeNameWithWord('Γιώργος Παππάς', '', 'MALE', 'el')).toBe('Γιώργος Παππάς');
		expect(relativeNameWithWord('', 'CHILD', 'MALE', 'el')).toBe('');
	});
});

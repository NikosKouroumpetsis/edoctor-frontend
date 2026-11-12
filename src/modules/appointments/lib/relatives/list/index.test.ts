import { describe, expect, it } from 'vitest';
import { buildRelativeRows, relativesAtLimit, relativesDoneText } from '.';

const giorgos = {
	relativeId: 'rel-1',
	firstName: 'Γιώργος',
	lastName: 'Παππάς',
	relationship: 'CHILD',
	gender: 'MALE'
};

describe('screen 55 · the list’s rows and words (record §11.2, U-139.5)', () => {
	it('a row: the initial, the name, the word of the relationship and gender', () => {
		expect(
			buildRelativeRows(
				[
					giorgos,
					{
						...giorgos,
						relativeId: 'rel-2',
						firstName: 'Άννα',
						lastName: 'Παππά',
						relationship: 'PARENT',
						gender: 'FEMALE'
					}
				],
				'el'
			)
		).toEqual([
			{ relativeId: 'rel-1', initial: 'Γ', name: 'Γιώργος Παππάς', word: 'Γιος' },
			{ relativeId: 'rel-2', initial: 'Ά', name: 'Άννα Παππά', word: 'Μητέρα' }
		]);
		expect(buildRelativeRows([giorgos], 'en')[0].word).toBe('Son');
	});

	it('(negative) a relationship this build cannot name reads no word, never the wire value; a surrogate pair stays whole as the initial', () => {
		const [row] = buildRelativeRows(
			[{ ...giorgos, relationship: 'COUSIN', firstName: '𝒜lex' }],
			'el'
		);
		expect(row.word).toBe('');
		expect(row.initial).toBe('𝒜');
	});

	it('the limit is the server’s 20 (`PATIENT_RELATIVES_MAX`)', () => {
		expect(relativesAtLimit(19)).toBe(false);
		expect(relativesAtLimit(20)).toBe(true);
		expect(relativesAtLimit(21)).toBe(true);
	});

	it('D-W4-33 · U-139.5: «Η Μαρία Παππά προστέθηκε.», «Ο Γιώργος Παππάς διαγράφηκε.», «Ο/Η …» for any other gender, «Οι αλλαγές αποθηκεύτηκαν.»', () => {
		expect(relativesDoneText({ kind: 'added', name: 'Μαρία Παππά', gender: 'FEMALE' }, 'el')).toBe(
			'Η Μαρία Παππά προστέθηκε.'
		);
		expect(
			relativesDoneText({ kind: 'deleted', name: 'Γιώργος Παππάς', gender: 'MALE' }, 'el')
		).toBe('Ο Γιώργος Παππάς διαγράφηκε.');
		expect(
			relativesDoneText({ kind: 'added', name: 'Άλεξ Παππά', gender: 'NON_BINARY' }, 'el')
		).toBe('Ο/Η Άλεξ Παππά προστέθηκε.');
		expect(relativesDoneText({ kind: 'saved' }, 'el')).toBe('Οι αλλαγές αποθηκεύτηκαν.');
		expect(relativesDoneText({ kind: 'gone' }, 'el')).toBe(
			'Αυτός ο συγγενής δεν είναι πια διαθέσιμος.'
		);
		expect(relativesDoneText({ kind: 'deleted', name: 'Anna Pappa', gender: 'FEMALE' }, 'en')).toBe(
			'Anna Pappa has been deleted.'
		);
	});
});

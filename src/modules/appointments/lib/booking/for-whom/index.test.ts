import { describe, expect, it } from 'vitest';
import { bookingPatientSample } from '../booking.sample';
import { buildForWhomOptions, forWhomOptionId } from '.';

describe('«Για ποιον είναι το ραντεβού;» (record §3.3, app = web)', () => {
	it('the account holder, then each relative by name', () => {
		const options = buildForWhomOptions(bookingPatientSample, 'el');
		expect(options.map((option) => [option.id, option.label])).toEqual([
			['self', 'Για μένα'],
			['rel-1', 'Πέτρος Μάρκου']
		]);
		expect(forWhomOptionId({ kind: 'relative', relativeId: 'rel-1' }, options)).toBe('rel-1');
	});

	it('U-139.5 · P-W4 Σ-15: under each name its line — the holder’s name under «Για μένα», the relative’s word by relationship and gender', () => {
		const patient = {
			...bookingPatientSample,
			relatives: [
				{
					relativeId: 'r-1',
					firstName: 'Γιώργος',
					lastName: 'Παππάς',
					relationship: 'CHILD',
					gender: 'MALE'
				},
				{
					relativeId: 'r-2',
					firstName: 'Άννα',
					lastName: 'Παππά',
					relationship: 'PARENT',
					gender: 'FEMALE'
				},
				{
					relativeId: 'r-3',
					firstName: 'Νίκη',
					lastName: 'Παππά',
					relationship: 'SIBLING',
					gender: 'NON_BINARY'
				}
			]
		};
		expect(buildForWhomOptions(patient, 'el').map((option) => option.description)).toEqual([
			'Ελένη Παππά',
			'Γιος',
			'Μητέρα',
			'Αδελφός/ή'
		]);
		expect(buildForWhomOptions(patient, 'en').map((option) => option.description)).toEqual([
			'Ελένη Παππά',
			'Son',
			'Mother',
			'Sibling'
		]);
	});

	it('(negative) a holder with no name and a relationship this build cannot name say nothing under the title', () => {
		const options = buildForWhomOptions(
			{
				...bookingPatientSample,
				firstName: null,
				lastName: null,
				relatives: [
					{
						relativeId: 'r-1',
						firstName: 'Γιώργος',
						lastName: 'Παππάς',
						relationship: '',
						gender: 'MALE'
					}
				]
			},
			'el'
		);
		expect(options.map((option) => option.description)).toEqual([null, null]);
	});

	it('(negative) no relatives: one row; a relative the list lost is no option', () => {
		const options = buildForWhomOptions({ ...bookingPatientSample, relatives: [] }, 'en');
		expect(options).toEqual([
			{ id: 'self', label: 'For me', description: 'Ελένη Παππά', visitor: { kind: 'self' } }
		]);
		expect(forWhomOptionId({ kind: 'relative', relativeId: 'gone' }, options)).toBeNull();
	});
});

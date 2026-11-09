import { describe, expect, it } from 'vitest';
import {
	buildDoctorProfessionOptions,
	filterDoctorProfessionOptions,
	readDoctorProfessionLabel
} from '.';

const catalogue = [
	{ professionalId: 'p-1', names: { el: 'Καρδιολόγος', en: 'Cardiologist' } },
	{ professionalId: 'p-2', names: { el: 'Καρδιοχειρουργός', en: null } },
	{ professionalId: 'p-3', names: { el: 'Παιδοκαρδιολόγος', en: 'Paediatric cardiologist' } },
	{ professionalId: 'p-4', names: { el: 'Παθολόγος', en: 'Internist' } }
];

describe('doctor-onboarding · lib/professions (record §6.2.4)', () => {
	it('the reader’s language, else the other one the server keeps, in the catalogue’s order', () => {
		expect(buildDoctorProfessionOptions(catalogue, 'en').map((option) => option.label)).toEqual([
			'Cardiologist',
			'Καρδιοχειρουργός',
			'Paediatric cardiologist',
			'Internist'
		]);
	});

	it('record §6.4: «καρδ» finds the three cardiologies, accents and case aside; no word is every one', () => {
		const options = buildDoctorProfessionOptions(catalogue, 'el');
		expect(
			filterDoctorProfessionOptions(options, 'ΚΑΡΔ').map((option) => option.professionalId)
		).toEqual(['p-1', 'p-2', 'p-3']);
		expect(filterDoctorProfessionOptions(options, 'παθολογος')).toHaveLength(1);
		expect(filterDoctorProfessionOptions(options, '  ')).toHaveLength(4);
		expect(filterDoctorProfessionOptions(options, '<img src=x>')).toEqual([]);
		expect(readDoctorProfessionLabel(options, 'p-4')).toBe('Παθολόγος');
		expect(readDoctorProfessionLabel(options, 'p-9')).toBeNull();
		expect(readDoctorProfessionLabel(options, null)).toBeNull();
	});
});

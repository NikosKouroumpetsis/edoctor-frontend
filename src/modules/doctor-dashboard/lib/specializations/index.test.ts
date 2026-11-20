import { describe, expect, it } from 'vitest';
import {
	mapDoctorSpecializationOptions,
	type DoctorSpecializationFacts,
	type DoctorSpecializationsFailure
} from '$modules/doctor-dashboard/api/specializations';
import {
	sampleSpecializationOptionsView,
	sampleTitleOptionsView
} from '$modules/doctor-dashboard/api/specializations/specializations.sample';
import { DOCTOR_SPECIALIZATION_LIMIT } from '$modules/doctor-dashboard/config';
import {
	buildDoctorSpecializationLines,
	buildDoctorSpecializationRows,
	doctorPracticeLicenceLine,
	doctorSpecializationsCountText,
	doctorSpecializationsFailureText,
	doctorSpecializationsHint,
	sameDoctorSpecializations,
	toggleDoctorSpecialization
} from './index';

/*
 * Wave 5.2 · screen 80 (U-209, U-225, D-W52-59): the pure rules of the specializations — the words of the page, the
 * rows of the choice and its limit. Lines of the server's own catalogue only (U-122).
 */

const plain = (text: string | null) => text?.replace(/\s/gu, ' ') ?? null;
const areas = mapDoctorSpecializationOptions(sampleSpecializationOptionsView()) ?? [];
const titles = mapDoctorSpecializationOptions(sampleTitleOptionsView()) ?? [];

describe('«Άδεια ασκήσεως» of screen 80 (D-W52-59)', () => {
	it('🔴 U-209 · D-W52-59: «Αριθμός 48213 · από 12 Μαρτίου 2010» — word for word, each part only with its fact, in both languages', () => {
		const both = { number: '48213', obtainedDay: '2010-03-12' };
		expect(plain(doctorPracticeLicenceLine(both, 'el'))).toBe(
			'Αριθμός 48213 · από 12 Μαρτίου 2010'
		);
		expect(plain(doctorPracticeLicenceLine(both, 'en'))).toBe(
			'Number 48213 · since March 12, 2010'
		);
		expect(doctorPracticeLicenceLine({ number: '48213', obtainedDay: null }, 'el')).toBe(
			'Αριθμός 48213'
		);
		expect(
			plain(doctorPracticeLicenceLine({ number: null, obtainedDay: '2010-03-12' }, 'el'))
		).toBe('Από 12 Μαρτίου 2010');
		expect(
			plain(doctorPracticeLicenceLine({ number: null, obtainedDay: '2010-03-12' }, 'en'))
		).toBe('Since March 12, 2010');
		expect(doctorPracticeLicenceLine({ number: null, obtainedDay: null }, 'el')).toBeNull();
		// A day the calendar lacks is no day (it never rolls to another).
		expect(doctorPracticeLicenceLine({ number: null, obtainedDay: '2010-02-31' }, 'el')).toBeNull();
	});
});

describe('the doctor’s picks on screen 80 (U-225, D-W52-59)', () => {
	const pick = (
		code: string,
		status: DoctorSpecializationFacts['status']
	): DoctorSpecializationFacts => ({ code, name: `Γραμμή ${code}`, kind: 'FEK_TITLE', status });

	it('🔴 U-225 · D-W52-59: a title the team still checks says «Ελέγχεται», one it refused «Δεν εγκρίθηκε» (the doctor’s to take out), an approved one nothing — in the server’s order', () => {
		expect(
			buildDoctorSpecializationLines(
				[pick('PR021-01', 'APPROVED'), pick('PR021-02', 'PENDING'), pick('PR021-03', 'REJECTED')],
				'el'
			)
		).toEqual([
			{ code: 'PR021-01', name: 'Γραμμή PR021-01', note: null, rejected: false },
			{ code: 'PR021-02', name: 'Γραμμή PR021-02', note: 'Ελέγχεται', rejected: false },
			{ code: 'PR021-03', name: 'Γραμμή PR021-03', note: 'Δεν εγκρίθηκε', rejected: true }
		]);
		expect(
			buildDoctorSpecializationLines(
				[pick('PR021-02', 'PENDING'), pick('PR021-03', 'REJECTED')],
				'en'
			).map((line) => line.note)
		).toEqual(['Being checked', 'Not approved']);
		expect(buildDoctorSpecializationLines([], 'el')).toEqual([]);
	});

	it('🔴 U-209 · D-W52-59: «N από 3» — the limit is the server’s three', () => {
		expect(DOCTOR_SPECIALIZATION_LIMIT).toBe(3);
		expect(doctorSpecializationsCountText(2, 'el')).toBe('2 από 3');
		expect(doctorSpecializationsCountText(1, 'el')).toBe('1 από 3');
		expect(doctorSpecializationsCountText(2, 'en')).toBe('2 of 3');
	});
});

describe('the choice of the specializations (U-209.3, U-112, U-225, D-W52-59)', () => {
	const codes = areas.map((line) => line.code);

	it('🔴 U-112 · D-W52-59: the list as rows in the server’s order, each by its code and the server’s name; below the limit every row can be pressed', () => {
		const rows = buildDoctorSpecializationRows(areas, ['PR011-15', 'PR011-17'], 'el');
		expect(rows.map((row) => [row.value, row.label])).toEqual(
			areas.map((line) => [line.code, line.name])
		);
		expect(rows.every((row) => row.disabled === false)).toBe(true);
		expect(rows.every((row) => !('detail' in row))).toBe(true);
	});

	it('🔴 U-209.3 · D-W52-59: at three the rows that are NOT chosen go out — the chosen ones never — and come back once one is taken out', () => {
		const three = ['PR011-15', 'PR011-17', 'PR011-04'];
		expect(
			buildDoctorSpecializationRows(areas, three, 'el')
				.filter((row) => row.disabled)
				.map((row) => row.value)
		).toEqual(codes.filter((code) => !three.includes(code)));
		expect(
			buildDoctorSpecializationRows(areas, three.slice(0, 2), 'el').some((row) => row.disabled)
		).toBe(false);
		expect(buildDoctorSpecializationRows(areas, [], 'el').some((row) => row.disabled)).toBe(false);
	});

	it('🔴 U-225 · D-W52-59: under a title of the Government Gazette «Τίτλος εξειδίκευσης· τον ελέγχει η ομάδα του eDoctor.» — never under a field of a society', () => {
		expect(buildDoctorSpecializationRows(titles, [], 'el').map((row) => row.detail)).toEqual([
			'Τίτλος εξειδίκευσης· τον ελέγχει η ομάδα του eDoctor.',
			'Τίτλος εξειδίκευσης· τον ελέγχει η ομάδα του eDoctor.',
			'Τίτλος εξειδίκευσης· τον ελέγχει η ομάδα του eDoctor.'
		]);
		expect(buildDoctorSpecializationRows(titles, [], 'en')[0].detail).toBe(
			'Specialization title; the eDoctor team checks it.'
		);
		expect(buildDoctorSpecializationRows(areas, [], 'el').some((row) => 'detail' in row)).toBe(
			false
		);
	});

	it('🔴 U-209.3 · D-W52-59: a press takes a chosen one out, puts another in below three, and at three changes nothing (negative: never a fourth)', () => {
		expect(toggleDoctorSpecialization([], 'PR011-04')).toEqual(['PR011-04']);
		expect(toggleDoctorSpecialization(['PR011-04', 'PR011-05'], 'PR011-04')).toEqual(['PR011-05']);
		expect(toggleDoctorSpecialization(['PR011-04', 'PR011-05'], 'PR011-14')).toEqual([
			'PR011-04',
			'PR011-05',
			'PR011-14'
		]);
		const full = ['PR011-04', 'PR011-05', 'PR011-14'];
		expect(toggleDoctorSpecialization(full, 'PR011-15')).toEqual(full);
		expect(toggleDoctorSpecialization(full, 'PR011-05')).toEqual(['PR011-04', 'PR011-14']);
		// The set handed in is never changed in place.
		expect(full).toEqual(['PR011-04', 'PR011-05', 'PR011-14']);
		let chosen: string[] = [];
		for (const code of codes) chosen = toggleDoctorSpecialization(chosen, code);
		expect(chosen).toHaveLength(3);
	});

	it('🔴 U-140: the line under the list — «N από 3», and at three «Διαλέξατε 3. Για να διαλέξετε άλλη, βγάλτε μία.» word for word', () => {
		expect(doctorSpecializationsHint(0, 'el')).toBe('0 από 3');
		expect(doctorSpecializationsHint(2, 'el')).toBe('2 από 3');
		expect(doctorSpecializationsHint(3, 'el')).toBe(
			'Διαλέξατε 3. Για να διαλέξετε άλλη, βγάλτε μία.'
		);
		expect(doctorSpecializationsHint(3, 'en')).toBe('You picked 3. To pick another, remove one.');
	});

	it('«Αποθήκευση» waits for a change: the same codes in any order are the same choice', () => {
		expect(sameDoctorSpecializations(['a', 'b'], ['b', 'a'])).toBe(true);
		expect(sameDoctorSpecializations([], [])).toBe(true);
		expect(sameDoctorSpecializations(['a'], ['a', 'b'])).toBe(false);
		expect(sameDoctorSpecializations(['a', 'b'], ['a', 'c'])).toBe(false);
	});

	it('🔴 D-W52-59: a refusal in the page’s words — past three its own sentence, a list that changed, too many writes, and for anything else that the change was not saved', () => {
		const text = (failure: Exclude<DoctorSpecializationsFailure, 'session'>) =>
			doctorSpecializationsFailureText(failure, 'el');
		expect(text('invalid')).toBe('Διαλέξατε 3. Για να διαλέξετε άλλη, βγάλτε μία.');
		expect(text('not-of-specialty')).toBe('Ο κατάλογος άλλαξε. Διαλέξτε ξανά και αποθηκεύστε.');
		expect(text('rate-limited')).toBe('Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.');
		for (const failure of ['conflict', 'forbidden', 'unknown'] as const) {
			expect(text(failure), failure).toBe(
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
			);
		}
		expect(doctorSpecializationsFailureText('not-of-specialty', 'en')).toBe(
			'The list has changed. Pick again and save.'
		);
	});
});

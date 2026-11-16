import { describe, expect, it } from 'vitest';
import { doctorAppointmentDetailFacts } from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import {
	buildDoctorCorrectionContext,
	buildDoctorCorrectionNow,
	doctorCorrectionEntry,
	doctorCorrectionOptions,
	doctorCorrectionTarget,
	doctorCorrectionThenLines
} from '.';

/*
 * Wave 5.1 · screen 71 «Διόρθωση έκβασης» in words (D-W51-62, card w51-w7): the prototype's `h1` (the system's
 * «Ολοκληρώθηκε» of Saturday 14 November, 09:00 Athens) and `h3` (the doctor's own «Δεν ήρθε»). Made-up people.
 */

const UNTIL_H1 = '2026-11-16T07:20:00.000Z';
const system = (patch: Parameters<typeof doctorAppointmentDetailFacts>[0] = {}) =>
	doctorAppointmentDetailFacts({
		status: 'completed',
		startTime: '2026-11-14T07:00:00.000Z',
		outcomeSource: 'SYSTEM',
		outcomeAt: '2026-11-15T07:30:00.000Z',
		outcomeCorrectableUntil: UNTIL_H1,
		actions: { correction: { to: 'NO_SHOW', until: UNTIL_H1 } as never },
		...patch
	});
const mine = () =>
	doctorAppointmentDetailFacts({
		status: 'no_show',
		startTime: '2026-11-13T16:00:00.000Z',
		outcomeSource: 'DOCTOR',
		outcomeAt: '2026-11-13T16:40:00.000Z',
		outcomeCorrectableUntil: '2026-11-15T16:20:00.000Z',
		actions: { correction: { to: 'COMPLETED', until: '2026-11-15T16:20:00.000Z' } as never }
	});

describe('screen 71 · «Διόρθωση έκβασης» in words (D-W51-62; 88 §71, `sw.js:557-577`)', () => {
	it('the box «Η επίσκεψη»: the day and the hour, «name · service · length», the street', () => {
		expect(buildDoctorCorrectionContext(system(), 'el')).toMatchObject({
			label: 'Η επίσκεψη',
			title: 'Σάββατο 14 Νοεμβρίου · 09:00',
			lines: ['Ιωάννα Καρρά · Επανέλεγχος · 20 λεπτά', 'Πατησίων 45'],
			name: 'Ιωάννα Καρρά'
		});
	});

	it('«Τώρα» of the system’s verdict: ««Ολοκληρώθηκε»» written automatically, «Διορθώνεται ως Δευτέρα 16 Νοεμβρίου, 09:20» — the server’s instant', () => {
		expect(buildDoctorCorrectionNow(system(), 'el')).toEqual({
			title: 'Τώρα',
			lines: [
				{
					title: '«Ολοκληρώθηκε»',
					body: 'Γράφτηκε αυτόματα, γιατί δεν δηλώσατε έκβαση σε 24 ώρες.'
				},
				{
					title: 'Διορθώνεται ως Δευτέρα 16 Νοεμβρίου, 09:20',
					body: '48 ώρες μετά το τέλος της επίσκεψης.'
				}
			]
		});
	});

	it('🔴 U-196.1: «Τώρα» of the doctor’s own verdict — «Το γράψατε εσείς · Παρασκευή 13 Νοεμβρίου, 18:40»', () => {
		const now = buildDoctorCorrectionNow(mine(), 'el');
		expect(now.lines[0]).toEqual({
			title: '«Δεν ήρθε»',
			body: 'Το γράψατε εσείς · Παρασκευή 13 Νοεμβρίου, 18:40'
		});
		expect(now.lines[1].title).toBe('Διορθώνεται ως Κυριακή 15 Νοεμβρίου, 18:20');
		// Without the instant it was written: no time made up.
		expect(buildDoctorCorrectionNow({ ...mine(), outcomeAt: null }, 'el').lines[0].body).toBe(
			'Το γράψατε εσείς'
		);
	});

	it('«Τι έγινε τελικά;» — the verdict it holds «όπως είναι τώρα», then the opposite the server opens', () => {
		expect(doctorCorrectionOptions(system(), 'el')).toEqual([
			{ value: 'COMPLETED', label: 'Ολοκληρώθηκε', note: 'όπως είναι τώρα' },
			{ value: 'NO_SHOW', label: 'Δεν ήρθε' }
		]);
		expect(doctorCorrectionOptions(mine(), 'el')).toEqual([
			{ value: 'NO_SHOW', label: 'Δεν ήρθε', note: 'όπως είναι τώρα' },
			{ value: 'COMPLETED', label: 'Ολοκληρώθηκε' }
		]);
	});

	it('«Τι θα γίνει» (88 §71): towards «Δεν ήρθε» three lines, towards «Ολοκληρώθηκε» two; none while nothing would change', () => {
		expect(doctorCorrectionThenLines('COMPLETED', 'NO_SHOW', 'el')).toEqual([
			'Ο ασθενής ενημερώνεται ότι γράφτηκε «Δεν ήρθε».',
			'Η πρόσκληση για κριτική ακυρώνεται.',
			'Αν ο ασθενής έχει ήδη γράψει κριτική, η διόρθωση δεν γίνεται.'
		]);
		expect(doctorCorrectionThenLines('NO_SHOW', 'COMPLETED', 'el')).toEqual([
			'Ο ασθενής ενημερώνεται.',
			'Ο ασθενής μπορεί να γράψει κριτική για την επίσκεψη.'
		]);
		expect(doctorCorrectionThenLines('COMPLETED', 'COMPLETED', 'el')).toEqual([]);
		expect(doctorCorrectionThenLines('COMPLETED', null, 'el')).toEqual([]);
	});

	it('🔴 U-196.1: the form for the system’s verdict and the doctor’s own while the server opens the opposite; only that opposite ever travels', () => {
		expect(doctorCorrectionEntry(system())).toBe('form');
		expect(doctorCorrectionEntry(mine())).toBe('form');
		expect(doctorCorrectionTarget(system(), 'NO_SHOW')).toBe('NO_SHOW');
		expect(doctorCorrectionTarget(mine(), 'COMPLETED')).toBe('COMPLETED');
	});

	it('(negative, U-65.6) «δεν γίνεται πια» without the server’s correction, for a visit not settled, towards the verdict it holds, without a source; nothing else travels', () => {
		for (const appointment of [
			system({ actions: { correction: null } }),
			system({ status: 'booked' }),
			system({ status: 'checked_in' }),
			system({ actions: { correction: { to: 'COMPLETED', until: UNTIL_H1 } as never } }),
			system({ outcomeSource: null })
		]) {
			expect(doctorCorrectionEntry(appointment)).toBe('closed');
			expect(doctorCorrectionTarget(appointment, 'NO_SHOW')).toBeNull();
			expect(doctorCorrectionTarget(appointment, 'COMPLETED')).toBeNull();
		}
		for (const chosen of ['COMPLETED', 'ARRIVED', 'no_show', '<b>NO_SHOW</b>', null, 1]) {
			expect(doctorCorrectionTarget(system(), chosen), String(chosen)).toBeNull();
		}
		expect(doctorCorrectionOptions(system({ actions: { correction: null } }), 'el')).toEqual([]);
	});
});

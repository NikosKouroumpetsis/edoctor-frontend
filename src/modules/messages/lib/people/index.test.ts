import { describe, expect, it } from 'vitest';
import { buildCounterpartFacts, nameInitial } from '.';

describe('the other person (U-84.3)', () => {
	it('a doctor: name, specialty, page', () => {
		const facts = buildCounterpartFacts(
			{
				kind: 'doctor',
				fullName: 'Dr. Athena Papadopoulou',
				doctorId: 'd',
				slug: 'dr-athena',
				specialty: 'Παθολόγος',
				photoUrl: null
			},
			'el'
		);
		expect(facts).toMatchObject({
			name: 'Dr. Athena Papadopoulou',
			subtitle: 'Παθολόγος',
			initial: 'A',
			isDoctor: true,
			slug: 'dr-athena'
		});
	});

	it('🔴 U-99.1: inside a sentence a doctor is «Dr. …»: by the conversation’s side, once, never for a patient or for no name', () => {
		const of = (kind: 'doctor' | 'patient', fullName: string | null) =>
			buildCounterpartFacts(
				{ kind, fullName, doctorId: null, slug: null, specialty: null, photoUrl: null },
				'el'
			);
		expect(of('doctor', 'Σοφία Ρηγοπούλου')).toMatchObject({
			name: 'Σοφία Ρηγοπούλου',
			sentenceName: 'Dr. Σοφία Ρηγοπούλου'
		});
		expect(of('doctor', 'Dr. Athena').sentenceName).toBe('Dr. Athena');
		expect(of('doctor', 'Δρ. Μαρία').sentenceName).toBe('Δρ. Μαρία');
		expect(of('doctor', null).sentenceName).toBe('Άλλος συμμετέχων');
		expect(of('patient', 'Μαρία Παπαδάκη').sentenceName).toBe('Μαρία Παπαδάκη');
		// A patient's name that looks like a doctor's is still a patient's: nothing is read from the name.
		expect(of('patient', 'Dr. Μαρία').sentenceName).toBe('Dr. Μαρία');
		expect(of('patient', 'Drakos').sentenceName).toBe('Drakos');
	});

	it('a patient: a name, «Ασθενής», no page and no photo even if one were sent', () => {
		const facts = buildCounterpartFacts(
			{
				kind: 'patient',
				fullName: 'Μαρία Παπαδάκη',
				doctorId: null,
				slug: 'x',
				specialty: 'y',
				photoUrl: 'https://example.test/a.jpg'
			},
			'el'
		);
		expect(facts).toMatchObject({
			name: 'Μαρία Παπαδάκη',
			subtitle: 'Ασθενής',
			initial: 'Μ',
			isDoctor: false,
			slug: null,
			imageUrl: null
		});
	});

	it('an account the server names no more (a deleted one)', () => {
		expect(buildCounterpartFacts(null, 'en').name).toBe('Other participant');
	});

	it('an initial is a whole character', () => {
		expect(nameInitial('🩺 Άννα')).toBe('🩺');
		expect(nameInitial('dr anna')).toBe('A');
	});
});

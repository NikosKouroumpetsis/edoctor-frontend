import { describe, expect, it } from 'vitest';
import type { DoctorPatientFacts } from '$modules/doctor-dashboard/api/patients';
import {
	buildDoctorNewOfficeChoices,
	buildDoctorPatientRow,
	buildDoctorPickedCard,
	clampDoctorPatientSearch,
	doctorNewChannels,
	doctorNewChannelsLabel,
	doctorNewOfficeShown,
	doctorNewPatientForm,
	doctorNewSummaryNote,
	doctorPatientVisitsLabel,
	doctorSamePhoneName,
	isDoctorNewPatientComplete,
	readDoctorGreekMobile,
	toDoctorNewAppointmentRequest
} from '.';

/* Wave 5.1 · screen 72 «Νέο ραντεβού» in words (D-W51-69 / 70; card w51-w8). Made-up people and ids only. */

const ID = '0193d000-0000-7000-8000-0000000000b1';
const patient = (patch: Partial<DoctorPatientFacts> = {}): DoctorPatientFacts => ({
	key: { kind: 'account', id: ID },
	person: { kind: 'ACCOUNT', patientId: ID, relativeId: null },
	firstName: 'Ιωάννα',
	lastName: 'Καρρά',
	phone: '306977654321',
	email: 'ioanna@seed.edoctor.test',
	hasAccount: true,
	bookedBy: null,
	visits: { count: 4, lastAt: '2026-10-22T08:00:00.000Z' },
	...patch
});
const NBSP = ' ';
const base = {
	doctorId: 'd',
	officeId: 'o',
	serviceId: 's',
	startTime: '2026-11-16T07:00:00.000Z'
};

describe('screen 72 · the rows of «οι ασθενείς μου» (D-W51-70)', () => {
	it('the name, «{κινητό} · {n} επισκέψεις · τελευταία {ημέρα}» (the mobile WHOLE, U-182.7), «Χωρίς λογαριασμό eDoctor» where it holds', () => {
		expect(buildDoctorPatientRow(patient(), 'el')).toEqual({
			id: `account:${ID}`,
			name: 'Ιωάννα Καρρά',
			lines: [`+30${NBSP}697${NBSP}765${NBSP}4321 · 4 επισκέψεις · τελευταία 22 Οκτωβρίου`],
			note: null
		});
		const record = buildDoctorPatientRow(
			patient({
				key: { kind: 'record', id: ID },
				person: { kind: 'RECORD', recordId: ID },
				hasAccount: false,
				visits: { count: 0, lastAt: null }
			}),
			'el'
		);
		expect(record.note).toBe('Χωρίς λογαριασμό eDoctor');
		// No visit yet: the mobile alone.
		expect(record.lines).toEqual([`+30${NBSP}697${NBSP}765${NBSP}4321`]);
	});

	it('a relative: «Το κλείνει: {όνομα} ({σχέση})», the relationship turned around; one visit in the singular', () => {
		const row = buildDoctorPatientRow(
			patient({
				key: { kind: 'relative', id: ID },
				person: { kind: 'ACCOUNT', patientId: ID, relativeId: ID },
				phone: null,
				bookedBy: { name: 'Ελένη Μαυρίδη', relationship: 'CHILD' },
				visits: { count: 1, lastAt: '2026-11-02T10:00:00.000Z' }
			}),
			'el'
		);
		expect(row.lines).toEqual([
			'1 επίσκεψη · τελευταία 2 Νοεμβρίου',
			'Το κλείνει: Ελένη Μαυρίδη (γονέας)'
		]);
		expect(doctorPatientVisitsLabel({ count: 2, lastAt: null }, 'en')).toBe('2 visits');
	});

	it('the chosen one’s card: «Έχει λογαριασμό eDoctor» / «Χωρίς λογαριασμό eDoctor», the name, the mobile, the visits', () => {
		expect(buildDoctorPickedCard(patient(), 'el')).toEqual({
			label: 'Έχει λογαριασμό eDoctor',
			name: 'Ιωάννα Καρρά',
			lines: [`+30${NBSP}697${NBSP}765${NBSP}4321`, '4 επισκέψεις · τελευταία 22 Οκτωβρίου']
		});
		expect(buildDoctorPickedCard(patient({ hasAccount: false }), 'el').label).toBe(
			'Χωρίς λογαριασμό eDoctor'
		);
	});

	it('«ίδιο κινητό»: the first person named among those with the mobile; none for none', () => {
		expect(doctorSamePhoneName([patient({ firstName: null, lastName: null }), patient()])).toBe(
			'Ιωάννα Καρρά'
		);
		expect(doctorSamePhoneName([])).toBeNull();
	});

	it('U-65.6: the search’s words are 40 at most, never half an emoji', () => {
		expect(clampDoctorPatientSearch('α'.repeat(41))).toHaveLength(40);
		expect(clampDoctorPatientSearch(`${'α'.repeat(39)}😀`)).toBe('α'.repeat(39));
	});
});

describe('🔴 U-197.3 · «Νέος ασθενής» (D-W51-54)', () => {
	it('a Greek mobile as the server reads it: 69 and 8 digits, spaces and +30 / 30 allowed', () => {
		for (const typed of [
			'6985551212',
			'698 555 1212',
			'+30 698 555 1212',
			'306985551212',
			' +306985551212 '
		]) {
			expect(readDoctorGreekMobile(typed), typed).toBe('6985551212');
		}
		// (negative) a landline, a foreign number, too short or long, letters, another prefix.
		for (const typed of [
			'2101234567',
			'698555121',
			'69855512123',
			'+44 698 555 1212',
			'69a5551212',
			'0030 698 555 1212',
			''
		]) {
			expect(readDoctorGreekMobile(typed), typed).toBeNull();
		}
	});

	it('name, surname and mobile are required, the email optional — one word of letters, the server’s bounds', () => {
		const rules = doctorNewPatientForm('el').validators ?? {};
		const first = (value: string) =>
			(rules.firstName ?? []).map((rule) => rule(value)).filter(Boolean);
		expect(first('')).toEqual([{ required: true }]);
		expect(first('Μαρία')).toEqual([]);
		expect(first('<b>x</b>')).toEqual([{ lettersOnly: true }]);
		expect(first('Μαρία-Ελένη')).toEqual([{ lettersOnly: true }]);
		expect(first('α'.repeat(81))).toEqual([{ maxLength: true }]);
		const email = (value: string) => (rules.email ?? []).map((rule) => rule(value)).filter(Boolean);
		expect(email('')).toEqual([]);
		expect(email('x@')).toEqual([{ email: true }]);
		expect(email(`${'a'.repeat(250)}@x.gr`)).toEqual([{ maxLength: true }]);
		const values = { firstName: 'Μαρία', lastName: 'Οικονόμου', phone: '6985551212', email: '' };
		expect(isDoctorNewPatientComplete(values)).toBe(true);
		expect(isDoctorNewPatientComplete({ ...values, phone: '' })).toBe(false);
		expect(isDoctorNewPatientComplete({ ...values, lastName: '' })).toBe(false);
		expect(isDoctorNewPatientComplete({ ...values, email: 'x' })).toBe(false);
		expect(doctorNewPatientForm('el').messages?.phone?.greekMobile).toBe(
			'Γράψτε ένα ελληνικό κινητό με 10 ψηφία.'
		);
	});
});

describe('🔴 U-197.2 · D-W51-56 · the one write', () => {
	it('`booked`, ONE service, and exactly one person: an account, a relative, a record or a new patient', () => {
		expect(
			toDoctorNewAppointmentRequest({ ...base, person: { kind: 'patient', patient: patient() } })
		).toEqual({
			doctorId: 'd',
			officeId: 'o',
			startTime: base.startTime,
			status: 'booked',
			services: [{ doctorServiceId: 's' }],
			patientId: ID,
			bookedForType: 'SELF'
		});
		const relative = patient({ person: { kind: 'ACCOUNT', patientId: 'h', relativeId: ID } });
		expect(
			toDoctorNewAppointmentRequest({ ...base, person: { kind: 'patient', patient: relative } })
		).toMatchObject({
			patientId: 'h',
			bookedForType: 'RELATIVE',
			relativeId: ID
		});
		const record = patient({ person: { kind: 'RECORD', recordId: ID } });
		const recordBody = toDoctorNewAppointmentRequest({
			...base,
			person: { kind: 'patient', patient: record }
		});
		expect(recordBody).toMatchObject({ patientRecordId: ID, status: 'booked' });
		expect(recordBody).not.toHaveProperty('patientId');
		const newBody = toDoctorNewAppointmentRequest({
			...base,
			person: {
				kind: 'new',
				values: {
					firstName: ' Μαρία ',
					lastName: 'Οικονόμου ',
					phone: ' 698 555 1212',
					email: '  '
				}
			}
		});
		expect(newBody.newPatient).toEqual({
			firstName: 'Μαρία',
			lastName: 'Οικονόμου',
			phone: '698 555 1212'
		});
		expect(newBody).not.toHaveProperty('patientId');
		expect(newBody).not.toHaveProperty('patientRecordId');
	});
});

describe('🔴 U-197.1 · D-W51-70 «Ενημέρωση»: the rules that hold today', () => {
	it('an account: app and email always, SMS with the doctor’s switch; without an account: email if any, SMS with the switch — never the app', () => {
		expect(doctorNewChannels({ hasAccount: true, hasEmail: true, smsOn: true })).toEqual([
			'app',
			'email',
			'sms'
		]);
		expect(doctorNewChannels({ hasAccount: true, hasEmail: false, smsOn: false })).toEqual([
			'app',
			'email'
		]);
		expect(doctorNewChannels({ hasAccount: false, hasEmail: true, smsOn: true })).toEqual([
			'email',
			'sms'
		]);
		expect(doctorNewChannels({ hasAccount: false, hasEmail: false, smsOn: true })).toEqual(['sms']);
		expect(doctorNewChannels({ hasAccount: false, hasEmail: true, smsOn: false })).toEqual([
			'email'
		]);
		expect(doctorNewChannels({ hasAccount: false, hasEmail: false, smsOn: false })).toEqual([]);
		expect(doctorNewChannelsLabel(['app', 'email', 'sms'], 'el')).toBe('Εφαρμογή · email · SMS');
		expect(doctorNewChannelsLabel(['email', 'sms'], 'el')).toBe('Email · SMS');
		expect(doctorNewChannelsLabel([], 'el')).toBe('Καμία');
	});

	it('under the summary: always confirmed; the SMS charged with the balance (or without a number the server did not say); with no channel, the phone', () => {
		expect(doctorNewSummaryNote({ channels: ['email', 'sms'], balance: 118, locale: 'el' })).toBe(
			'Το ραντεβού κλείνεται επιβεβαιωμένο. Το SMS χρεώνεται στα πακέτα σας (υπόλοιπο 118).'
		);
		expect(doctorNewSummaryNote({ channels: ['sms'], balance: null, locale: 'el' })).toBe(
			'Το ραντεβού κλείνεται επιβεβαιωμένο. Το SMS χρεώνεται στα πακέτα σας.'
		);
		expect(doctorNewSummaryNote({ channels: ['email'], balance: 5, locale: 'el' })).toBe(
			'Το ραντεβού κλείνεται επιβεβαιωμένο.'
		);
		expect(doctorNewSummaryNote({ channels: [], balance: 5, locale: 'el' })).toBe(
			'Το ραντεβού κλείνεται επιβεβαιωμένο. Ο ασθενής δεν έχει email και το SMS είναι κλειστό: πείτε του την ώρα στο τηλέφωνο.'
		);
	});
});

describe('screen 72 · «Ιατρείο» (D-W51-70)', () => {
	it('only with more than one; each its street and its whole address, in the page’s language when written', () => {
		const offices = [
			{
				id: 'a',
				doctorId: 'd',
				lines: [
					{ language: 'el', line: 'Κηφισίας 120', address: 'Κηφισίας 120, Αθήνα 11526' },
					{ language: 'en', line: 'Kifisias 120', address: 'Kifisias 120, Athens 11526' }
				]
			},
			{
				id: 'b',
				doctorId: 'd',
				lines: [{ language: 'el', line: 'Πατησίων 45', address: 'Πατησίων 45' }]
			}
		];
		expect(buildDoctorNewOfficeChoices(offices, 'en')).toEqual([
			{ value: 'a', label: 'Kifisias 120', detail: 'Kifisias 120, Athens 11526' },
			{ value: 'b', label: 'Πατησίων 45', detail: 'Πατησίων 45' }
		]);
		expect(doctorNewOfficeShown(offices)).toBe(true);
		expect(doctorNewOfficeShown(offices.slice(0, 1))).toBe(false);
	});
});

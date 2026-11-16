import { describe, expect, it } from 'vitest';
import {
	doctorAppointmentFacts,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import type {
	DoctorPatientCardFacts,
	DoctorPatientRowFacts
} from '$modules/doctor-dashboard/api/patients';
import {
	buildDoctorPatientAppointmentRow,
	buildDoctorPatientCard,
	buildDoctorPatientListRow,
	buildDoctorPatientListRows,
	buildDoctorPatientMergeLines,
	doctorPatientConversationFacts,
	doctorPatientDoneMessage,
	doctorPatientMergeFailureMessage,
	doctorPatientRecordFailureMessage,
	doctorPatientRecordFieldMessage,
	doctorPatientRecordForm,
	doctorPatientWhenLabel,
	keepDoctorPatientIdInput,
	toDoctorPatientRecordPatch,
	toDoctorPatientRecordValues,
	type DoctorPatientRecordValues
} from '.';

/* Screen 73 in words (D-W51-73 … 76), «now» the prototype's Saturday 14 November 2026, 12:40 Athens. Made-up people. */

const NBSP = '\u00a0';
const P = '0193d000-0000-7000-8000-0000000000b1';
const REL = '0193d000-0000-7000-8000-0000000000b2';
const R = '0193d000-0000-7000-8000-0000000000b3';

const rowOf = (patch: Partial<DoctorPatientRowFacts> = {}): DoctorPatientRowFacts => ({
	key: { kind: 'account', id: P },
	person: { kind: 'ACCOUNT', patientId: P, relativeId: null },
	firstName: 'Ιωάννα',
	lastName: 'Καρρά',
	phone: '306977654321',
	email: null,
	hasAccount: true,
	bookedBy: null,
	visits: { count: 4, lastAt: '2026-10-22T08:00:00.000Z' },
	next: null,
	noShows: 0,
	...patch
});

const emptyPage = { items: [], nextCursor: null, total: 0 };
const cardOf = (patch: Partial<DoctorPatientCardFacts> = {}): DoctorPatientCardFacts => ({
	key: { kind: 'account', id: P },
	hasAccount: true,
	firstName: 'Ιωάννα',
	lastName: 'Καρρά',
	phone: '306977654321',
	email: 'ioanna@seed.edoctor.test',
	amka: '23048501234',
	afm: '098765432',
	gender: null,
	relationship: null,
	bookedBy: null,
	visits: { count: 4, firstAt: '2026-03-03T07:30:00.000Z', lastAt: '2026-10-22T08:00:00.000Z' },
	noShows: 1,
	editable: false,
	conversationId: null,
	addedAt: null,
	mergeCandidate: null,
	upcoming: emptyPage,
	past: emptyPage,
	...patch
});

describe('D-W51-74 · a row of «Οι ασθενείς μου» (the 55’s rows, U-112)', () => {
	it('«Επόμενο: Δευτέρα 16 Νοεμβρίου, 11:00 · 4 επισκέψεις»; a request «Αίτημα · σήμερα, 17:30»; else «N επισκέψεις · τελευταία …»', () => {
		expect(
			buildDoctorPatientListRow(
				rowOf({ next: { startTime: '2026-11-16T09:00:00.000Z', request: false } }),
				TODAY_NOW,
				'el'
			)
		).toEqual({
			id: `account:${P}`,
			key: { kind: 'account', id: P },
			name: 'Ιωάννα Καρρά',
			lines: ['Επόμενο: Δευτέρα 16 Νοεμβρίου, 11:00 · 4 επισκέψεις'],
			note: null
		});
		expect(
			buildDoctorPatientListRow(
				rowOf({
					visits: { count: 0, lastAt: null },
					next: { startTime: '2026-11-14T15:30:00.000Z', request: true }
				}),
				TODAY_NOW,
				'el'
			).lines
		).toEqual(['Αίτημα · σήμερα, 17:30']);
		expect(
			buildDoctorPatientListRow(
				rowOf({
					visits: { count: 0, lastAt: null },
					next: { startTime: '2026-11-14T11:00:00.000Z', request: false }
				}),
				TODAY_NOW,
				'el'
			).lines
		).toEqual(['Επόμενο: σήμερα, 13:00']);
		expect(
			buildDoctorPatientListRow(
				rowOf({ visits: { count: 5, lastAt: '2026-11-14T07:00:00.000Z' } }),
				TODAY_NOW,
				'el'
			).lines
		).toEqual(['5 επισκέψεις · τελευταία σήμερα']);
		expect(buildDoctorPatientListRow(rowOf(), TODAY_NOW, 'el').lines).toEqual([
			'4 επισκέψεις · τελευταία 22 Οκτωβρίου'
		]);
		expect(
			buildDoctorPatientListRow(rowOf({ visits: { count: 0, lastAt: null } }), TODAY_NOW, 'el')
				.lines
		).toEqual([]);
	});

	it('«Το κλείνει: …» for a relative (the relationship turned around); «Χωρίς λογαριασμό eDoctor» for a record — in the quiet word', () => {
		const relative = buildDoctorPatientListRow(
			rowOf({
				key: { kind: 'relative', id: REL },
				firstName: 'Νίκος',
				lastName: 'Μαυρίδης',
				visits: { count: 0, lastAt: null },
				next: { startTime: '2026-11-14T15:30:00.000Z', request: true },
				bookedBy: { name: 'Ελένη Μαυρίδη', relationship: 'CHILD' }
			}),
			TODAY_NOW,
			'el'
		);
		expect(relative.lines).toEqual([
			'Αίτημα · σήμερα, 17:30',
			'Το κλείνει: Ελένη Μαυρίδη (γονέας)'
		]);
		const record = buildDoctorPatientListRow(
			rowOf({ key: { kind: 'record', id: R }, hasAccount: false }),
			TODAY_NOW,
			'el'
		);
		expect(record.note).toBe('Χωρίς λογαριασμό eDoctor');
		expect(record.id).toBe(`record:${R}`);
	});

	it('U-112: γραμμές — the rows one under the other, each person once (pages that moved keep the first)', () => {
		const rows = buildDoctorPatientListRows(
			[
				rowOf(),
				rowOf({ firstName: 'Άλλη' }),
				rowOf({ key: { kind: 'record', id: R }, hasAccount: false })
			],
			TODAY_NOW,
			'el'
		);
		expect(rows.map((row) => row.id)).toEqual([`account:${P}`, `record:${R}`]);
		expect(rows[0]?.name).toBe('Ιωάννα Καρρά');
	});

	it('the words of the line in English; «σήμερα» small inside a line', () => {
		expect(doctorPatientWhenLabel('2026-11-14T15:30:00.000Z', TODAY_NOW, 'el')).toBe(
			'σήμερα, 17:30'
		);
		expect(doctorPatientWhenLabel('2026-11-15T15:30:00.000Z', TODAY_NOW, 'el')).toBe(
			'αύριο, 17:30'
		);
		expect(doctorPatientWhenLabel('2026-11-14T15:30:00.000Z', TODAY_NOW, 'en')).toBe(
			'today, 17:30'
		);
		expect(
			buildDoctorPatientListRow(
				rowOf({ next: { startTime: '2026-11-14T15:30:00.000Z', request: true } }),
				TODAY_NOW,
				'en'
			).lines
		).toEqual(['Request · today, 17:30']);
	});
});

describe('D-W51-75 · one appointment of the card', () => {
	it('«Σήμερα · 13:00» near today, else the whole day; «Επίσκεψη · 30 λεπτά · Κηφισίας 120»; the state in the doctor’s words', () => {
		expect(
			buildDoctorPatientAppointmentRow(
				doctorAppointmentFacts({ startTime: '2026-11-14T11:00:00.000Z' }),
				TODAY_NOW,
				'el'
			)
		).toEqual({
			id: '0193d000-0000-7000-8000-000000000001',
			title: 'Σήμερα · 13:00',
			subtitle: 'Επίσκεψη · 30 λεπτά · Κηφισίας 120',
			status: { label: 'Επιβεβαιωμένο', tone: 'success' }
		});
		const past = buildDoctorPatientAppointmentRow(
			doctorAppointmentFacts({ startTime: '2026-07-02T09:00:00.000Z', status: 'no_show' }),
			TODAY_NOW,
			'el'
		);
		expect(past.title).toBe('Πέμπτη 2 Ιουλίου · 12:00');
		expect(past.status.label).toBe('Δεν ήρθε');
		expect(
			buildDoctorPatientAppointmentRow(
				doctorAppointmentFacts({ status: 'canceled', canceledBy: 'DOCTOR' }),
				TODAY_NOW,
				'el'
			).status.label
		).toBe('Ακυρώθηκε από εσάς');
	});
});

describe('D-W51-75 · the card', () => {
	it('🔴 U-182.7: an account — «4 επισκέψεις · 1 φορά δεν ήρθε · πρώτη 3 Μαρτίου 2026», «Κλήση», the details WHOLE, «only the patient changes them»', () => {
		const content = buildDoctorPatientCard(cardOf(), TODAY_NOW, 'el');
		expect(content.name).toBe('Ιωάννα Καρρά');
		expect(content.stats).toBe('4 επισκέψεις · 1 φορά δεν ήρθε · πρώτη 3 Μαρτίου 2026');
		expect(content.tags).toEqual([]);
		expect(content.call).toEqual({
			label: `+30${NBSP}697${NBSP}765${NBSP}4321`,
			dial: '+306977654321'
		});
		expect(content.dataTitle).toBe('Στοιχεία');
		expect(content.rows).toEqual([
			{ id: 'phone', label: 'Κινητό', value: `+30${NBSP}697${NBSP}765${NBSP}4321` },
			{ id: 'email', label: 'Email', value: 'ioanna@seed.edoctor.test' },
			{ id: 'amka', label: 'ΑΜΚΑ', value: '23048501234' },
			{ id: 'afm', label: 'ΑΦΜ', value: '098765432' }
		]);
		expect(content.note).toBe(
			'Τα στοιχεία τα αλλάζει μόνο ο ίδιος ο ασθενής, από τον λογαριασμό του.'
		);
		expect(content.editable).toBe(false);
		expect(content.merge).toBeNull();
		expect(content.booker).toBeNull();
		expect(buildDoctorPatientCard(cardOf({ noShows: 2 }), TODAY_NOW, 'el').stats).toBe(
			'4 επισκέψεις · 2 φορές δεν ήρθε · πρώτη 3 Μαρτίου 2026'
		);
		expect(
			buildDoctorPatientCard(
				cardOf({ visits: { count: 0, firstAt: null, lastAt: null }, noShows: 0 }),
				TODAY_NOW,
				'el'
			).stats
		).toBe('Πρώτη επίσκεψη σε εσάς');
	});

	it('🔴 U-182.7: a relative — «Ασθενής» with the ΑΜΚΑ and the gender (never a date of birth), «Το κλείνει: …» and the holder WHOLE; «Κλήση» calls the holder', () => {
		const content = buildDoctorPatientCard(
			cardOf({
				key: { kind: 'relative', id: REL },
				firstName: 'Νίκος',
				lastName: 'Μαυρίδης',
				phone: null,
				email: null,
				amka: '01021512345',
				afm: null,
				gender: 'MALE',
				relationship: 'CHILD',
				visits: { count: 0, firstAt: null, lastAt: null },
				noShows: 0,
				bookedBy: {
					firstName: 'Ελένη',
					lastName: 'Μαυρίδη',
					phone: '306941234567',
					email: 'eleni@seed.edoctor.test',
					amka: '12057801234',
					afm: '123456789'
				}
			}),
			TODAY_NOW,
			'el'
		);
		expect(content.dataTitle).toBe('Ασθενής');
		expect(content.rows).toEqual([
			{ id: 'amka', label: 'ΑΜΚΑ', value: '01021512345' },
			{ id: 'gender', label: 'Φύλο', value: 'Άνδρας' }
		]);
		expect(content.tags).toEqual([
			{ id: 'booked-by', label: 'Το κλείνει: Ελένη Μαυρίδη (γονέας)' }
		]);
		expect(content.booker?.title).toBe('Το κλείνει: Ελένη Μαυρίδη (γονέας)');
		expect(content.booker?.rows.map((row) => row.value)).toEqual([
			`+30${NBSP}694${NBSP}123${NBSP}4567`,
			'eleni@seed.edoctor.test',
			'12057801234',
			'123456789'
		]);
		expect(content.call?.dial).toBe('+306941234567');
		expect(content.note).toBe(
			'Τα στοιχεία αλλάζουν μόνο από τον λογαριασμό eDoctor που κλείνει τα ραντεβού.'
		);
		expect(JSON.stringify(content)).not.toMatch(/Ημερομηνία γέννησης/u);
	});

	it('a record — «Χωρίς λογαριασμό eDoctor», «Τον προσθέσατε εσείς στις 30 Οκτωβρίου 2026…», «Επεξεργασία», «Δεν έχει δοθεί» as `null`; 🔴 U-198.2 «Ίσως είναι ο ίδιος…» only for the doctor’s record with a candidate', () => {
		const record = cardOf({
			key: { kind: 'record', id: R },
			hasAccount: false,
			email: null,
			amka: null,
			afm: null,
			editable: true,
			addedAt: '2026-10-30T10:00:00.000Z',
			mergeCandidate: { key: { kind: 'account', id: P }, firstName: 'Ιωάννα', lastName: 'Καρρά' }
		});
		const content = buildDoctorPatientCard(record, TODAY_NOW, 'el');
		expect(content.tags).toEqual([{ id: 'no-account', label: 'Χωρίς λογαριασμό eDoctor' }]);
		expect(content.note).toBe(
			'Τον προσθέσατε εσείς στις 30 Οκτωβρίου 2026. Τα στοιχεία τα βλέπετε και τα αλλάζετε μόνο εσείς.'
		);
		expect(content.editable).toBe(true);
		expect(content.rows.filter((row) => row.value === null).map((row) => row.id)).toEqual([
			'email',
			'amka',
			'afm'
		]);
		expect(content.merge).toEqual({
			body: 'Ίσως είναι ο ίδιος με τον λογαριασμό Ιωάννα Καρρά.',
			patientId: P
		});
		expect(
			buildDoctorPatientCard({ ...record, editable: false }, TODAY_NOW, 'el').merge
		).toBeNull();
	});
});

describe('D-W51-76 · «Στοιχεία ασθενή»', () => {
	const values = (patch: Partial<DoctorPatientRecordValues> = {}): DoctorPatientRecordValues => ({
		firstName: 'Καλλιόπη',
		lastName: 'Ζέρβα',
		phone: '+30 697 100 2003',
		email: '',
		amka: '',
		afm: '',
		...patch
	});
	const errorsOf = (input: DoctorPatientRecordValues) => {
		const config = doctorPatientRecordForm('el');
		return Object.fromEntries(
			(Object.keys(config.validators ?? {}) as (keyof DoctorPatientRecordValues)[]).flatMap(
				(field) => {
					const failed = (config.validators?.[field] ?? [])
						.map((rule) => rule(input[field]))
						.find((error) => error !== null);
					return failed
						? [[field, config.messages?.[field]?.[Object.keys(failed)[0] as string]]]
						: [];
				}
			)
		);
	};

	it('opens with the record as kept (the mobile as shown, plain spaces), the empty ones empty', () => {
		expect(
			toDoctorPatientRecordValues(
				cardOf({
					key: { kind: 'record', id: R },
					firstName: 'Καλλιόπη',
					lastName: 'Ζέρβα',
					phone: '306971002003',
					email: null,
					amka: null,
					afm: null
				})
			)
		).toEqual(values());
	});

	it('🔴 U-65.6 (negative): ΑΜΚΑ of 10 digits, a date that is none, ΑΦΜ of a wrong check digit, HTML in a name, 81 letters, a mobile that is not Greek, an email that is none — each its own words', () => {
		expect(errorsOf(values())).toEqual({});
		expect(errorsOf(values({ amka: '0211198512' }))).toEqual({ amka: 'Το ΑΜΚΑ έχει 11 ψηφία.' });
		expect(errorsOf(values({ amka: '32139912345' }))).toEqual({
			amka: 'Το ΑΜΚΑ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.'
		});
		expect(errorsOf(values({ afm: '123456788' }))).toEqual({
			afm: 'Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.'
		});
		expect(errorsOf(values({ afm: '12345678' }))).toEqual({ afm: 'Το ΑΦΜ έχει 9 ψηφία.' });
		expect(errorsOf(values({ firstName: '<b>x</b>' }))).toEqual({
			firstName: 'Συμπληρώστε ένα όνομα, μόνο με γράμματα.'
		});
		expect(errorsOf(values({ lastName: 'α'.repeat(81) }))).toEqual({
			lastName: 'Συμπληρώστε το επώνυμο.'
		});
		expect(errorsOf(values({ phone: '2101234567' }))).toEqual({
			phone: 'Γράψτε ένα ελληνικό κινητό με 10 ψηφία.'
		});
		expect(errorsOf(values({ email: 'not-an-email' }))).toEqual({
			email: 'Συμπληρώστε ένα έγκυρο email.'
		});
		expect(errorsOf(values({ firstName: '' }))).toEqual({ firstName: 'Συμπληρώστε το όνομα.' });
	});

	it('D-W51-66: the patch — every field, the mobile its 10 digits, an emptied one `null`; nothing while a rule breaks', () => {
		expect(
			toDoctorPatientRecordPatch(values({ amka: '02111985123', email: 'z@seed.edoctor.test' }))
		).toEqual({
			firstName: 'Καλλιόπη',
			lastName: 'Ζέρβα',
			phone: '6971002003',
			email: 'z@seed.edoctor.test',
			amka: '02111985123',
			afm: null
		});
		expect(toDoctorPatientRecordPatch(values({ amka: '0211198512' }))).toBeNull();
		expect(toDoctorPatientRecordPatch(values({ phone: '' }))).toBeNull();
		expect(toDoctorPatientRecordPatch(values({ firstName: '<script>' }))).toBeNull();
	});

	it('the ΑΜΚΑ / ΑΦΜ fields keep only their digits, 11 / 9 at most', () => {
		expect(keepDoctorPatientIdInput('amka', '021 119-85123x99')).toBe('02111985123');
		expect(keepDoctorPatientIdInput('afm', 'ΑΦΜ 123 456 789 0')).toBe('123456789');
	});

	it('D-W51-76: a refusal — 422 on the fields (the id that is no real one «δεν είναι έγκυρο»), 409 «δεν αλλάζει πια», 404 gone, else «δοκιμάστε ξανά»; the session says nothing', () => {
		const invalid = {
			kind: 'invalid' as const,
			fields: ['amka' as const],
			invalidIds: ['amka' as const]
		};
		expect(doctorPatientRecordFieldMessage('amka', invalid, 'el')).toBe(
			'Το ΑΜΚΑ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.'
		);
		expect(doctorPatientRecordFieldMessage('afm', invalid, 'el')).toBe('Το ΑΦΜ έχει 9 ψηφία.');
		const none = { fields: [], invalidIds: [] };
		expect(doctorPatientRecordFailureMessage({ kind: 'merged', ...none }, 'el')).toBe(
			'Ο ασθενής ενώθηκε με λογαριασμό eDoctor, οπότε τα στοιχεία αυτά δεν αλλάζουν πια.'
		);
		expect(doctorPatientRecordFailureMessage({ kind: 'missing', ...none }, 'el')).toBe(
			'Ο ασθενής δεν βρέθηκε. Τα στοιχεία δεν αποθηκεύτηκαν.'
		);
		expect(doctorPatientRecordFailureMessage({ kind: 'unknown', ...none }, 'el')).toBe(
			'Τα στοιχεία δεν αποθηκεύτηκαν. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(doctorPatientRecordFailureMessage({ kind: 'session', ...none }, 'el')).toBeNull();
		expect(doctorPatientDoneMessage('saved', 'el')).toBe('Αποθηκεύτηκε.');
	});
});

describe('🔴 U-198.2 · the join', () => {
	it('the three lines (the two names, the app unchanged, not undone) and «Οι καρτέλες ενώθηκαν.»; a refusal in words', () => {
		expect(
			buildDoctorPatientMergeLines(
				{
					firstName: 'Μαρία',
					lastName: 'Καρρά',
					mergeCandidate: {
						key: { kind: 'account', id: P },
						firstName: 'Ιωάννα',
						lastName: 'Καρρά'
					}
				},
				'el'
			)
		).toEqual([
			'Η καρτέλα «Μαρία Καρρά» και ο λογαριασμός «Ιωάννα Καρρά» γίνονται μία καρτέλα, με όλα τα ραντεβού.',
			'Η εφαρμογή του ασθενή δεν αλλάζει: τα ραντεβού που κλείσατε εσείς δεν εμφανίζονται εκεί.',
			'Η ένωση δεν αναιρείται.'
		]);
		expect(doctorPatientDoneMessage('merged', 'el')).toBe('Οι καρτέλες ενώθηκαν.');
		expect(doctorPatientMergeFailureMessage({ kind: 'gone' }, 'el')).toBe(
			'Η ένωση δεν είναι πια δυνατή για αυτόν τον ασθενή.'
		);
		expect(doctorPatientMergeFailureMessage({ kind: 'unknown' }, 'el')).toBe(
			'Η ένωση δεν έγινε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(doctorPatientMergeFailureMessage({ kind: 'session' }, 'el')).toBeNull();
	});
});

describe('🔴 U-193.1 · D-W51-87: a conversation the doctor starts from a card', () => {
	const C = '0193d000-0000-7000-8000-0000000000c1';
	const page = (items: ReturnType<typeof doctorAppointmentFacts>[]) => ({ ...emptyPage, items });

	it('an account: its name, the nearest open appointment ahead (a `pending` one a request), the conversation it has', () => {
		const facts = doctorPatientConversationFacts(
			cardOf({
				conversationId: C,
				upcoming: page([
					doctorAppointmentFacts({ startTime: '2026-11-20T09:00:00.000Z', status: 'booked' }),
					doctorAppointmentFacts({ startTime: '2026-11-16T09:00:00.000Z', status: 'pending' })
				])
			})
		);
		expect(facts).toEqual({
			name: 'Ιωάννα Καρρά',
			line: { kind: 'request', startTime: '2026-11-16T09:00:00.000Z', forRelative: null },
			conversationId: C
		});
	});

	it('a relative: the account that books holds it — its name; the line says who it is for', () => {
		const facts = doctorPatientConversationFacts(
			cardOf({
				key: { kind: 'relative', id: REL },
				firstName: 'Νίκος',
				lastName: 'Μαυρίδης',
				relationship: 'CHILD',
				bookedBy: {
					firstName: 'Ελένη',
					lastName: 'Μαυρίδη',
					phone: null,
					email: null,
					amka: null,
					afm: null
				},
				upcoming: page([
					doctorAppointmentFacts({ startTime: '2026-11-16T09:00:00.000Z', status: 'booked' })
				])
			})
		);
		expect(facts).toEqual({
			name: 'Ελένη Μαυρίδη',
			line: {
				kind: 'upcoming',
				startTime: '2026-11-16T09:00:00.000Z',
				forRelative: { firstName: 'Νίκος', lastName: 'Μαυρίδης', relation: 'CHILD' }
			},
			conversationId: null
		});
	});

	it('nothing open ahead: the last visit, else no line', () => {
		expect(doctorPatientConversationFacts(cardOf())?.line).toEqual({
			kind: 'lastVisit',
			startTime: '2026-10-22T08:00:00.000Z',
			forRelative: null
		});
		expect(
			doctorPatientConversationFacts(
				cardOf({
					visits: { count: 0, firstAt: null, lastAt: null },
					upcoming: page([doctorAppointmentFacts({ status: 'canceled' })])
				})
			)?.line
		).toBeNull();
	});

	it('🔴 D-W51-71 (negative): a record, or a card with no account, is no one to write to', () => {
		expect(doctorPatientConversationFacts(cardOf({ key: { kind: 'record', id: R } }))).toBeNull();
		expect(doctorPatientConversationFacts(cardOf({ hasAccount: false }))).toBeNull();
	});
});

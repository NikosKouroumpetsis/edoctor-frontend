import { describe, expect, it } from 'vitest';
import {
	doctorAppointmentDetailFacts,
	doctorAppointmentDetailRow,
	doctorRequestForRelativeRow,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import { mapDoctorAppointmentDetail } from '$modules/doctor-dashboard/api/appointments';
import {
	buildDoctorAppointmentBlock,
	buildDoctorAppointmentHead,
	buildDoctorAppointmentLog,
	buildDoctorAppointmentPatientBox,
	buildDoctorAppointmentRows,
	buildDoctorAppointmentTerms,
	doctorAppointmentMessageTarget,
	doctorReasonLabel,
	doctorUntilPhrase
} from '.';

/* Screen 68 in words (D-W51-38), «now» the prototype's Saturday 14 November 2026, 12:40 Athens. */

const NBSP = ' ';
const booked = () => doctorAppointmentDetailFacts();
const request = () => {
	const facts = mapDoctorAppointmentDetail(doctorRequestForRelativeRow());
	if (!facts) throw new Error('unreadable');
	return facts;
};
const rowOf = (rows: ReturnType<typeof buildDoctorAppointmentRows>, id: string) =>
	rows.find((row) => row.id === id);

describe('screen 68 · the head (D-W51-38)', () => {
	it('the doctor’s pill, the day and the time, «Σε 2 ημέρες · Διάρκεια 20 λεπτά» (the prototype’s `u2`)', () => {
		expect(buildDoctorAppointmentHead(booked(), TODAY_NOW, 'el')).toEqual({
			status: { label: 'Επιβεβαιωμένο', tone: 'success' },
			day: 'Δευτέρα 16 Νοεμβρίου',
			time: '11:00',
			sub: 'Σε 2 ημέρες · Διάρκεια 20 λεπτά'
		});
	});

	it('within the day: «Σε 5 ώρες» (`r1`, 17:30), «Σε 20 λεπτά», «Πριν από 2 ώρες» (`o1`, 10:30), «Χθες» (`o2`)', () => {
		expect(buildDoctorAppointmentHead(request(), TODAY_NOW, 'el').sub).toBe(
			'Σε 5 ώρες · Διάρκεια 30 λεπτά'
		);
		const at = (startTime: string) =>
			buildDoctorAppointmentHead(doctorAppointmentDetailFacts({ startTime }), TODAY_NOW, 'el').sub;
		expect(at('2026-11-14T11:00:00.000Z')).toBe('Σε 20 λεπτά · Διάρκεια 20 λεπτά');
		expect(at('2026-11-14T08:30:00.000Z')).toBe('Πριν από 2 ώρες · Διάρκεια 20 λεπτά');
		expect(at('2026-11-13T07:00:00.000Z')).toBe('Χθες · Διάρκεια 20 λεπτά');
	});

	it('over: the length alone, the state in the doctor’s words («Απορρίφθηκε από εσάς», «Ακυρώθηκε από τον ασθενή»)', () => {
		const rejected = doctorAppointmentDetailFacts({ status: 'rejected', rejectedBy: 'DOCTOR' });
		expect(buildDoctorAppointmentHead(rejected, TODAY_NOW, 'el')).toMatchObject({
			status: { label: 'Απορρίφθηκε από εσάς' },
			sub: 'Διάρκεια 20 λεπτά'
		});
		const canceled = doctorAppointmentDetailFacts({ status: 'canceled', canceledBy: 'PATIENT' });
		expect(buildDoctorAppointmentHead(canceled, TODAY_NOW, 'el').status.label).toBe(
			'Ακυρώθηκε από τον ασθενή'
		);
	});
});

describe('screen 68 · what asks for an answer first (88 §68)', () => {
	it('a request: «Το αίτημα λήγει σήμερα στις 16:30, αν δεν απαντήσετε.» with «Επιβεβαίωση»', () => {
		expect(
			buildDoctorAppointmentBlock({
				appointment: request(),
				now: TODAY_NOW,
				done: null,
				locale: 'el'
			})
		).toEqual({
			kind: 'request',
			text: 'Το αίτημα λήγει σήμερα στις 16:30, αν δεν απαντήσετε.',
			lines: [],
			confirm: true
		});
		const tomorrow = mapDoctorAppointmentDetail({
			...doctorRequestForRelativeRow(),
			expiresAt: '2026-11-15T07:00:00.000Z'
		});
		expect(
			buildDoctorAppointmentBlock({
				appointment: tomorrow!,
				now: TODAY_NOW,
				done: null,
				locale: 'el'
			})?.text
		).toBe('Το αίτημα λήγει αύριο στις 09:00, αν δεν απαντήσετε.');
	});

	it('a visit begun: «Τι έγινε με την επίσκεψη;», the system’s outcome, «Δεν ήρθε · Ολοκληρώθηκε»', () => {
		const begun = doctorAppointmentDetailFacts({
			startTime: '2026-11-14T08:30:00.000Z',
			unattendedOutcomeAt: '2026-11-15T08:30:00.000Z',
			actions: { canCancel: true, outcomes: ['ARRIVED', 'NO_SHOW', 'COMPLETED'] }
		});
		expect(
			buildDoctorAppointmentBlock({ appointment: begun, now: TODAY_NOW, done: null, locale: 'el' })
		).toEqual({
			kind: 'outcome',
			text: 'Τι έγινε με την επίσκεψη;',
			lines: ['Αν δεν απαντήσετε, αύριο στις 10:30 γράφεται «Ολοκληρώθηκε».'],
			outcomes: ['NO_SHOW', 'COMPLETED'],
			// Over (10:50 < 12:40): no «Ήρθε, είναι ακόμα στο ιατρείο» though the server offers `ARRIVED` (D-W51-61).
			arrive: false,
			meaning:
				'«Ολοκληρώθηκε»: ο ασθενής μπορεί να γράψει κριτική. «Δεν ήρθε»: ο ασθενής ενημερώνεται και δεν γράφει κριτική.'
		});
	});

	it('the green card of an outcome this page wrote — only once the server says so', () => {
		const completed = doctorAppointmentDetailFacts({ status: 'completed' });
		expect(
			buildDoctorAppointmentBlock({
				appointment: completed,
				now: TODAY_NOW,
				done: 'COMPLETED',
				locale: 'el'
			})
		).toEqual({
			kind: 'done',
			text: 'Γράφτηκε «Ολοκληρώθηκε».',
			lines: ['Ο ασθενής μπορεί να γράψει κριτική.']
		});
		const noShow = doctorAppointmentDetailFacts({ status: 'no_show' });
		expect(
			buildDoctorAppointmentBlock({
				appointment: noShow,
				now: TODAY_NOW,
				done: 'NO_SHOW',
				locale: 'el'
			})
		).toMatchObject({
			kind: 'done',
			text: 'Γράφτηκε «Δεν ήρθε».',
			lines: ['Ο ασθενής ενημερώθηκε.']
		});
		// Rewrites «D-W51-39: a visit over WITHOUT this page's answer says nothing on the web until step 7»: D-W51-61 (step 7,
		// card w51-w7) says its open correction — and nothing while the server opens none (this one).
		expect(
			buildDoctorAppointmentBlock({
				appointment: completed,
				now: TODAY_NOW,
				done: null,
				locale: 'el'
			})
		).toBeNull();
	});

	it('how it ended: who and when, the reason in the doctor’s voice, the words, the patient told', () => {
		const rejected = doctorAppointmentDetailFacts({
			status: 'rejected',
			rejectedBy: 'DOCTOR',
			rejectedAt: '2026-11-14T10:45:00.000Z',
			rejectReasonCode: 'SLOT_TAKEN',
			rejectReasonText: 'Δεν προλαβαίνω.'
		});
		expect(
			buildDoctorAppointmentBlock({
				appointment: rejected,
				now: TODAY_NOW,
				done: null,
				locale: 'el'
			})
		).toEqual({
			kind: 'closed',
			text: 'Το αίτημα απορρίφθηκε.',
			lines: [
				'Από εσάς · Σάββατο 14 Νοεμβρίου, 12:45',
				'Λόγος: Η ώρα είναι πιασμένη',
				'Το μήνυμά σας: «Δεν προλαβαίνω.»',
				'Ο ασθενής ενημερώθηκε.'
			]
		});
		const byPatient = doctorAppointmentDetailFacts({
			status: 'canceled',
			canceledBy: 'PATIENT',
			canceledAt: '2026-11-14T09:00:00.000Z',
			cancelReasonCode: 'FEELING_BETTER',
			cancelReasonText: 'Είμαι καλύτερα.'
		});
		expect(
			buildDoctorAppointmentBlock({
				appointment: byPatient,
				now: TODAY_NOW,
				done: null,
				locale: 'el'
			})
		).toEqual({
			kind: 'closed',
			text: 'Το ραντεβού ακυρώθηκε.',
			lines: [
				'Από τον ασθενή · Σάββατο 14 Νοεμβρίου, 11:00',
				'Λόγος: Αισθάνομαι καλύτερα',
				'Το μήνυμα του ασθενή: «Είμαι καλύτερα.»'
			]
		});
		const requestGone = doctorAppointmentDetailFacts({
			status: 'canceled',
			canceledBy: 'PATIENT',
			confirmedAt: null
		});
		expect(
			buildDoctorAppointmentBlock({
				appointment: requestGone,
				now: TODAY_NOW,
				done: null,
				locale: 'el'
			})?.text
		).toBe('Το αίτημα ακυρώθηκε.');
	});

	it('(negative) nothing for a kept visit ahead, an expired request, a request the server no longer lets answer', () => {
		for (const appointment of [
			booked(),
			doctorAppointmentDetailFacts({ status: 'expired' }),
			doctorAppointmentDetailFacts({ status: 'pending', actions: { canConfirm: false } })
		]) {
			expect(
				buildDoctorAppointmentBlock({ appointment, now: TODAY_NOW, done: null, locale: 'el' })
			).toBeNull();
		}
		expect(doctorReasonLabel('<b>x</b>', 'DOCTOR', 'el')).toBeNull();
		expect(doctorReasonLabel(null, 'DOCTOR', 'el')).toBeNull();
	});
});

describe('🔴 U-182.7: ο γιατρός βλέπει ολόκληρα — the box and its rows (88 §68)', () => {
	it('the patient: the name, «4η επίσκεψη σε εσάς · τελευταία 22 Οκτωβρίου», the mobile to call', () => {
		expect(buildDoctorAppointmentPatientBox(booked(), 'el')).toEqual({
			name: 'Ιωάννα Καρρά',
			visits: { label: '4η επίσκεψη σε εσάς · τελευταία 22 Οκτωβρίου', first: false },
			// D-W51-71 (step 8; shape): an account's appointment carries no «Χωρίς λογαριασμό eDoctor».
			noAccount: null,
			call: { label: ['+30', '697', '765', '4321'].join(NBSP), dial: '+306977654321' }
		});
		expect(buildDoctorAppointmentPatientBox(request(), 'el')).toMatchObject({
			name: 'Νίκος Μαυρίδης (γιος)',
			visits: { label: 'Πρώτη επίσκεψη σε εσάς', first: true },
			call: { dial: '+306941234567' }
		});
	});

	it('🔴 U-182.7: «Στοιχεία ασθενή» WHOLE — mobile, email, ΑΜΚΑ, ΑΦΜ, never masked', () => {
		const rows = buildDoctorAppointmentRows(booked(), 'el');
		expect(rows.map((row) => row.id)).toEqual([
			'date-time',
			'office',
			'services',
			'patient',
			'note',
			'price'
		]);
		expect(rowOf(rows, 'patient')?.pairs).toEqual([
			{
				id: 'mobile',
				label: 'Κινητό',
				value: ['+30', '697', '765', '4321'].join(NBSP),
				dial: '+306977654321'
			},
			{ id: 'email', label: 'Email', value: 'ioanna.karra@example.gr' },
			{ id: 'amka', label: 'ΑΜΚΑ', value: '23048501234' },
			{ id: 'afm', label: 'ΑΦΜ', value: '098765432' }
		]);
		expect(JSON.stringify(rows)).not.toMatch(/\*|•/u);
	});

	it('the other rows: the day, the office with its floor muted, the service, the note, the cost with its notice', () => {
		const rows = buildDoctorAppointmentRows(booked(), 'el');
		expect(rowOf(rows, 'date-time')?.values).toEqual(['Δευτέρα 16 Νοεμβρίου · 11:00']);
		expect(rowOf(rows, 'office')).toMatchObject({
			label: 'Ιατρείο',
			values: ['Πατησίων 45, Αθήνα'],
			hint: '1ος όροφος'
		});
		expect(rowOf(rows, 'services')?.values).toEqual(['Επανέλεγχος · 20 λεπτά']);
		expect(rowOf(rows, 'note')).toMatchObject({
			label: 'Σημείωση του ασθενή',
			values: ['Θα φέρω τις εξετάσεις αίματος.']
		});
		expect(rowOf(rows, 'price')).toMatchObject({
			label: 'Κόστος',
			emphasis: true,
			hint: 'Ο ασθενής βλέπει την τιμή ως ενδεικτική.'
		});
		expect(rowOf(rows, 'price')?.values[0]).toMatch(/^45/u);
	});

	it('a relative: «Ασθενής» (the name with the word, ΑΜΚΑ, φύλο) and «Το έκλεισε» (the holder whole)', () => {
		const rows = buildDoctorAppointmentRows(request(), 'el');
		expect(rows.map((row) => row.id)).toEqual([
			'date-time',
			'office',
			'services',
			'visitor',
			'booker',
			'note',
			'price'
		]);
		expect(rowOf(rows, 'visitor')).toMatchObject({
			label: 'Ασθενής',
			values: ['Νίκος Μαυρίδης (γιος)'],
			pairs: [
				{ id: 'amka', label: 'ΑΜΚΑ', value: '01021512345' },
				{ id: 'gender', label: 'Φύλο', value: 'Άνδρας' }
			]
		});
		expect(rowOf(rows, 'booker')?.values).toEqual(['Ελένη Μαυρίδη']);
		expect(rowOf(rows, 'booker')?.pairs.map((pair) => pair.value)).toEqual([
			['+30', '694', '123', '4567'].join(NBSP),
			'eleni.mavridi@example.gr',
			'12057801234',
			'123456789'
		]);
	});

	it('(negative) no note is no row; a fact the server did not send is no label; a broken visits key is no tag', () => {
		const bare = doctorAppointmentDetailFacts({
			patientNote: null,
			patientSnapshot: {
				id: 'p',
				tenantUserId: null,
				firstName: 'Α',
				lastName: 'Β',
				phoneE164: null
			},
			visitsWithDoctor: { count: -1, lastAt: null }
		});
		const rows = buildDoctorAppointmentRows(bare, 'el');
		expect(rows.map((row) => row.id)).not.toContain('note');
		expect(rows.map((row) => row.id)).not.toContain('patient');
		expect(buildDoctorAppointmentPatientBox(bare, 'el')).toMatchObject({
			visits: null,
			call: null
		});
	});
});

describe('screen 68 · «Οι όροι σας» and «Χρονολόγιο»', () => {
	it('«Επιβεβαιωμένο» and «Ο ασθενής ακυρώνει έως 8 ώρες πριν · δηλαδή έως Δευτέρα 16 Νοεμβρίου, 03:00.»', () => {
		expect(buildDoctorAppointmentTerms(booked(), 'el')).toEqual({
			title: 'Οι όροι σας',
			lines: [
				'Επιβεβαιωμένο',
				'Ο ασθενής ακυρώνει έως 8 ώρες πριν · δηλαδή έως Δευτέρα 16 Νοεμβρίου, 03:00.'
			]
		});
	});

	it('a request «Επιβεβαίωση από εσάς» (U-90.1 Α2: the deadline IS the start ⇒ «έως την ώρα του ραντεβού»); one passed; instant', () => {
		expect(buildDoctorAppointmentTerms(request(), 'el')?.lines).toEqual([
			'Επιβεβαίωση από εσάς',
			'Ο ασθενής ακυρώνει έως την ώρα του ραντεβού.'
		]);
		const passed = doctorAppointmentDetailFacts({
			confirmationModeSnapshot: 'AUTO',
			patientCancellation: { cutoffHours: 8, deadline: null }
		});
		expect(buildDoctorAppointmentTerms(passed, 'el')?.lines).toEqual([
			'Άμεση επιβεβαίωση',
			'Η προθεσμία ακύρωσης του ασθενή πέρασε.'
		]);
	});

	it('(negative) none for one that is over or begun', () => {
		for (const status of ['completed', 'canceled', 'checked_in', 'expired']) {
			expect(
				buildDoctorAppointmentTerms(doctorAppointmentDetailFacts({ status }), 'el')
			).toBeNull();
		}
	});

	it('the trail oldest first: «Ζητήθηκε · … · από τον ασθενή», «Επιβεβαιώθηκε · … · από εσάς», «αυτόματα»; a note’s edit left out', () => {
		const appointment = doctorAppointmentDetailFacts({
			auditLogs: [
				{
					action: 'OUTCOME_DECLARED',
					actorRole: 'SYSTEM',
					afterSnapshot: { status: 'completed' },
					createdAt: '2026-11-16T10:00:00.000Z'
				},
				{
					action: 'UPDATED',
					actorRole: 'MEMBER',
					beforeSnapshot: { patientNote: 'a' },
					afterSnapshot: { patientNote: 'b' },
					createdAt: '2026-11-11T10:00:00.000Z'
				},
				{
					action: 'UPDATED',
					actorRole: 'DOCTOR',
					beforeSnapshot: { startTime: '2026-11-16T08:00:00.000Z' },
					afterSnapshot: { startTime: '2026-11-16T09:00:00.000Z' },
					createdAt: '2026-11-12T10:00:00.000Z'
				},
				...doctorAppointmentDetailRow().auditLogs!
			]
		});
		expect(
			buildDoctorAppointmentLog(appointment, 'el').map((line) => [line.title, line.detail])
		).toEqual([
			['Ζητήθηκε', 'Τρίτη 10 Νοεμβρίου, 12:04 · από τον ασθενή'],
			['Επιβεβαιώθηκε', 'Τρίτη 10 Νοεμβρίου, 12:31 · από εσάς'],
			['Μετακινήθηκε', 'Πέμπτη 12 Νοεμβρίου, 12:00 · από εσάς'],
			['Ολοκληρώθηκε', 'Δευτέρα 16 Νοεμβρίου, 12:00 · αυτόματα']
		]);
	});
});

describe('the detail’s facts (U-65.6: field by field, nothing made up)', () => {
	it('the three keys of the doctor side as sent; the conversation only as a server id', () => {
		const facts = booked();
		expect(facts.visitsWithDoctor).toEqual({ count: 3, lastAt: '2026-10-22T08:00:00.000Z' });
		expect(facts.patientCancellation).toEqual({
			cutoffHours: 8,
			deadline: '2026-11-16T01:00:00.000Z'
		});
		expect(facts.conversationId).toBe('0193d000-0000-7000-8000-0000000000c1');
		for (const conversationId of ['../x', 'javascript:alert(1)', '1', 42, null]) {
			expect(
				doctorAppointmentDetailFacts({ conversationId }).conversationId,
				String(conversationId)
			).toBeNull();
		}
	});

	it('(negative) a broken ΑΜΚΑ / ΑΦΜ / email is left out, never drawn; an answer without its id or state is none', () => {
		const facts = doctorAppointmentDetailFacts({
			patientSnapshot: {
				id: 'p',
				tenantUserId: null,
				firstName: 'Α',
				lastName: 'Β',
				phoneE164: 'κλήση',
				email: '<script>',
				amka: '12<b>3',
				afm: 'x'.repeat(30)
			},
			patientCancellation: { cutoffHours: 'eight', deadline: null }
		});
		expect(facts.patient).toEqual({ name: 'Α Β', phone: null, email: null, amka: null, afm: null });
		expect(facts.patientCancellation).toBeNull();
		expect(mapDoctorAppointmentDetail({ ...doctorAppointmentDetailRow(), id: '' })).toBeNull();
		expect(
			mapDoctorAppointmentDetail({ ...doctorAppointmentDetailRow(), status: 'lost' as never })
		).toBeNull();
		expect(mapDoctorAppointmentDetail(null)).toBeNull();
	});
});

describe('🔴 screen 71 · the outcome’s blocks on the 68 (D-W51-61; 88 §71, `sw.js:404-418`)', () => {
	const ongoing = (patch: Parameters<typeof doctorAppointmentDetailFacts>[0] = {}) =>
		doctorAppointmentDetailFacts({
			// 12:30 – 12:50 Athens, «now» 12:40: the visit lasts.
			startTime: '2026-11-14T10:30:00.000Z',
			unattendedOutcomeAt: '2026-11-15T10:50:00.000Z',
			actions: { canCancel: true, outcomes: ['ARRIVED', 'NO_SHOW', 'COMPLETED'] },
			...patch
		});
	const block = (
		appointment: ReturnType<typeof doctorAppointmentDetailFacts>,
		extra: Partial<Parameters<typeof buildDoctorAppointmentBlock>[0]> = {}
	) =>
		buildDoctorAppointmentBlock({
			appointment,
			now: TODAY_NOW,
			done: null,
			locale: 'el',
			...extra
		});

	it('🔴 D-W51-61: from the hour to the end «Η επίσκεψη είναι σε εξέλιξη.», «Δεν ήρθε · Ολοκληρώθηκε» and «Ήρθε, είναι ακόμα στο ιατρείο» (ARRIVED, as the server offers it)', () => {
		expect(block(ongoing())).toMatchObject({
			kind: 'outcome',
			text: 'Η επίσκεψη είναι σε εξέλιξη.',
			lines: ['Αν δεν απαντήσετε, αύριο στις 12:50 γράφεται «Ολοκληρώθηκε».'],
			outcomes: ['NO_SHOW', 'COMPLETED'],
			arrive: true
		});
		// (negative) the server offers no `ARRIVED`: no link.
		expect(block(ongoing({ actions: { outcomes: ['NO_SHOW', 'COMPLETED'] } }))).toMatchObject({
			arrive: false
		});
	});

	it('🔴 D-W51-61: after «Ήρθε» (`checked_in`) «Ο ασθενής είναι στο ιατρείο.» with the two buttons and no link — during the visit and after it', () => {
		for (const startTime of ['2026-11-14T10:30:00.000Z', '2026-11-14T08:30:00.000Z']) {
			expect(
				block(
					ongoing({
						startTime,
						status: 'checked_in',
						actions: { outcomes: ['NO_SHOW', 'COMPLETED'] }
					})
				)
			).toMatchObject({
				kind: 'outcome',
				text: 'Ο ασθενής είναι στο ιατρείο.',
				outcomes: ['NO_SHOW', 'COMPLETED'],
				arrive: false
			});
		}
	});

	it('(negative) before the hour nothing: the server offers no outcome', () => {
		expect(block(booked())).toBeNull();
		expect(
			block(ongoing({ startTime: '2026-11-14T11:00:00.000Z', actions: { outcomes: [] } }))
		).toBeNull();
	});

	it('🔴 U-196.1: ο γιατρός διορθώνει και τη δική του απάντηση ως 48 ώρες — «Γράψατε «Δεν ήρθε». Αν έγινε λάθος, …» with the server’s instant', () => {
		const mine = doctorAppointmentDetailFacts({
			status: 'no_show',
			startTime: '2026-11-13T16:00:00.000Z',
			outcomeSource: 'DOCTOR',
			outcomeAt: '2026-11-13T16:40:00.000Z',
			// Sunday 15 November, 18:30 Athens: tomorrow from Saturday.
			outcomeCorrectableUntil: '2026-11-15T16:30:00.000Z',
			actions: { correction: { to: 'COMPLETED', until: '2026-11-15T16:30:00.000Z' } as never }
		});
		expect(block(mine)).toEqual({
			kind: 'correction',
			text: 'Γράψατε «Δεν ήρθε». Αν έγινε λάθος, μπορείτε να το διορθώσετε ως αύριο, 18:30.',
			lines: []
		});
	});

	it('D-W51-61: the system’s «Ολοκληρώθηκε» — «Το «Ολοκληρώθηκε» γράφτηκε αυτόματα, γιατί δεν δηλώσατε έκβαση. Μπορείτε να το διορθώσετε ως τη Δευτέρα …»', () => {
		const system = doctorAppointmentDetailFacts({
			status: 'completed',
			startTime: '2026-11-14T07:00:00.000Z',
			outcomeSource: 'SYSTEM',
			outcomeAt: '2026-11-15T07:30:00.000Z',
			outcomeCorrectableUntil: '2026-11-16T07:20:00.000Z',
			actions: { correction: { to: 'NO_SHOW', until: '2026-11-16T07:20:00.000Z' } as never }
		});
		expect(block(system)?.text).toBe(
			'Το «Ολοκληρώθηκε» γράφτηκε αυτόματα, γιατί δεν δηλώσατε έκβαση. Μπορείτε να το διορθώσετε ως τη Δευτέρα 16 Νοεμβρίου, 09:20.'
		);
		expect(block(system)?.kind).toBe('correction');
	});

	it('(negative) no correction without the server’s `actions.correction`, towards the verdict it holds, or without a source; the green card of a tap wins', () => {
		const settled = (patch: Parameters<typeof doctorAppointmentDetailFacts>[0]) =>
			doctorAppointmentDetailFacts({
				status: 'completed',
				startTime: '2026-11-14T07:00:00.000Z',
				outcomeSource: 'DOCTOR',
				outcomeCorrectableUntil: '2026-11-16T07:20:00.000Z',
				...patch
			});
		expect(block(settled({ actions: { correction: null } }))).toBeNull();
		expect(
			block(
				settled({
					actions: { correction: { to: 'COMPLETED', until: '2026-11-16T07:20:00.000Z' } as never }
				})
			)
		).toBeNull();
		expect(
			block(
				settled({
					outcomeSource: null,
					actions: { correction: { to: 'NO_SHOW', until: '2026-11-16T07:20:00.000Z' } as never }
				})
			)
		).toBeNull();
		const open = settled({
			actions: { correction: { to: 'NO_SHOW', until: '2026-11-16T07:20:00.000Z' } as never }
		});
		expect(block(open, { done: 'COMPLETED' })).toMatchObject({
			kind: 'done',
			text: 'Γράφτηκε «Ολοκληρώθηκε».'
		});
	});

	it('🔴 D-W51-62: after a correction the green card «Διορθώθηκε σε «…».» from the screen’s memory — only while the visit holds that verdict', () => {
		const noShow = doctorAppointmentDetailFacts({
			status: 'no_show',
			outcomeSource: 'DOCTOR',
			actions: { correction: { to: 'COMPLETED', until: '2026-11-16T07:20:00.000Z' } as never }
		});
		expect(block(noShow, { saved: { kind: 'corrected', to: 'NO_SHOW' } })).toEqual({
			kind: 'done',
			text: 'Διορθώθηκε σε «Δεν ήρθε».',
			lines: ['Ο ασθενής ενημερώθηκε· η πρόσκληση για κριτική ακυρώθηκε.']
		});
		const completed = doctorAppointmentDetailFacts({ status: 'completed' });
		expect(block(completed, { saved: { kind: 'corrected', to: 'COMPLETED' } })).toEqual({
			kind: 'done',
			text: 'Διορθώθηκε σε «Ολοκληρώθηκε».',
			lines: ['Ο ασθενής ενημερώθηκε και μπορεί να γράψει κριτική.']
		});
		// (negative) a visit that holds the other verdict since then: the card says nothing of it.
		expect(block(completed, { saved: { kind: 'corrected', to: 'NO_SHOW' } })).toBeNull();
	});

	it('the {πότε}: the server’s instant on the office’s clock — «σήμερα, …», «αύριο, …», else the day with its article', () => {
		const at = (instant: string, locale: 'el' | 'en' = 'el') =>
			doctorUntilPhrase(instant, TODAY_NOW, locale, 'Europe/Athens');
		expect(at('2026-11-14T16:30:00.000Z')).toBe('σήμερα, 18:30');
		expect(at('2026-11-15T16:30:00.000Z')).toBe('αύριο, 18:30');
		expect(at('2026-11-16T07:00:00.000Z')).toBe('τη Δευτέρα 16 Νοεμβρίου, 09:00');
		expect(at('2026-11-17T07:00:00.000Z')).toBe('την Τρίτη 17 Νοεμβρίου, 09:00');
		expect(at('2026-11-21T07:00:00.000Z')).toBe('το Σάββατο 21 Νοεμβρίου, 09:00');
		expect(at('2026-11-22T07:00:00.000Z')).toBe('την Κυριακή 22 Νοεμβρίου, 09:00');
		expect(at('2026-11-15T16:30:00.000Z', 'en')).toMatch(/^tomorrow, /u);
		expect(at('2026-11-16T07:00:00.000Z', 'en')).toMatch(/^Monday/u);
		// (negative) no instant, no words.
		expect(at('soon')).toBeNull();
	});
});

describe('🔴 screen 72 on the 68 (D-W51-70, D-W51-71, U-197.2; card w51-w8)', () => {
	const line = (
		action: string,
		actorKind: 'DOCTOR' | 'BACKOFFICE' | 'PATIENT',
		at: string,
		status = 'booked'
	) => ({
		action,
		actorKind,
		at,
		status: status as 'booked',
		previousStartTime: null,
		nextStartTime: '2026-11-16T09:00:00.000Z'
	});

	it('U-197.2: booked by the doctor reads ONE «Κλείστηκε · από εσάς»; a request created by anyone else stays «Ζητήθηκε», its confirmation stays', () => {
		const mine = {
			...booked(),
			auditTrail: [
				line('CREATED', 'DOCTOR', '2026-11-14T10:45:00.000Z'),
				line('CONFIRMED', 'DOCTOR', '2026-11-14T10:45:00.000Z')
			]
		};
		expect(buildDoctorAppointmentLog(mine, 'el').map((entry) => entry.title)).toEqual([
			'Κλείστηκε'
		]);
		expect(buildDoctorAppointmentLog(mine, 'el')[0]?.detail).toContain('από εσάς');
		const theirs = {
			...booked(),
			auditTrail: [
				line('CREATED', 'PATIENT', '2026-11-10T10:04:00.000Z', 'pending'),
				line('CONFIRMED', 'DOCTOR', '2026-11-10T10:31:00.000Z')
			]
		};
		expect(buildDoctorAppointmentLog(theirs, 'el').map((entry) => entry.title)).toEqual([
			'Ζητήθηκε',
			'Επιβεβαιώθηκε'
		]);
		// (negative) a pending created by the doctor (the API's, no screen) is no «Κλείστηκε».
		const pending = {
			...booked(),
			auditTrail: [line('CREATED', 'DOCTOR', '2026-11-14T10:45:00.000Z', 'pending')]
		};
		expect(buildDoctorAppointmentLog(pending, 'el').map((entry) => entry.title)).toEqual([
			'Ζητήθηκε'
		]);
	});

	it('D-W51-70: «Το ραντεβού κλείστηκε.» and how the patient was told, as the summary said it', () => {
		const block = (told: ('app' | 'email' | 'sms')[]) =>
			buildDoctorAppointmentBlock({
				appointment: booked(),
				now: TODAY_NOW,
				done: null,
				saved: { kind: 'booked', told },
				locale: 'el'
			});
		expect(block(['app', 'email', 'sms'])).toEqual({
			kind: 'done',
			text: 'Το ραντεβού κλείστηκε.',
			lines: ['Ο ασθενής το βλέπει στην εφαρμογή του και ενημερώθηκε.']
		});
		expect(block(['email', 'sms'])?.lines).toEqual(['Ο ασθενής ενημερώθηκε με SMS και email.']);
		expect(block(['sms'])?.lines).toEqual(['Ο ασθενής ενημερώθηκε με SMS.']);
		expect(block(['email'])?.lines).toEqual(['Ο ασθενής ενημερώθηκε με email.']);
		expect(block([])).toEqual({ kind: 'done', text: 'Το ραντεβού κλείστηκε.', lines: [] });
	});

	it('🔴 D-W51-71: χωρίς λογαριασμό = χωρίς Μήνυμα — the conversation is none for the doctor’s record, the box says «Χωρίς λογαριασμό eDoctor»', () => {
		const record = { ...booked(), patientKind: 'RECORD' as const };
		expect(doctorAppointmentMessageTarget(record)).toBeNull();
		expect(
			doctorAppointmentMessageTarget({ ...record, conversationId: booked().conversationId })
		).toBeNull();
		expect(doctorAppointmentMessageTarget(booked())).not.toBeNull();
		expect(buildDoctorAppointmentPatientBox(record, 'el').noAccount).toBe(
			'Χωρίς λογαριασμό eDoctor'
		);
		expect(buildDoctorAppointmentPatientBox(booked(), 'en').noAccount).toBeNull();
	});

	// Rewrites «U-193.1 (ως το βήμα 10): Μήνυμα μόνο με συνομιλία» (step 4) → D-W51-87: the doctor writes first.
	it('🔴 U-193.1: ο γιατρός γράφει πρώτος — the conversation when there is one, else the account or the relative of the appointment; nothing without a key', () => {
		const C = '0193d000-0000-7000-8000-0000000000c1';
		const P = '0193d000-0000-7000-8000-0000000000b3';
		expect(
			doctorAppointmentMessageTarget({
				patientKind: 'ACCOUNT',
				conversationId: C,
				patientKey: { kind: 'account', id: P }
			})
		).toEqual({ conversationId: C });
		expect(
			doctorAppointmentMessageTarget({
				patientKind: 'ACCOUNT',
				conversationId: null,
				patientKey: { kind: 'account', id: P }
			})
		).toEqual({ patient: { kind: 'account', id: P } });
		expect(
			doctorAppointmentMessageTarget({
				patientKind: 'ACCOUNT',
				conversationId: null,
				patientKey: { kind: 'relative', id: P }
			})
		).toEqual({ patient: { kind: 'relative', id: P } });
		expect(
			doctorAppointmentMessageTarget({
				patientKind: 'ACCOUNT',
				conversationId: null,
				patientKey: null
			})
		).toBeNull();
		expect(
			doctorAppointmentMessageTarget({
				patientKind: 'ACCOUNT',
				conversationId: null,
				patientKey: { kind: 'record', id: P }
			})
		).toBeNull();
	});
});

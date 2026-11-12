import { describe, expect, it } from 'vitest';
import {
	appointmentActionsSample,
	appointmentFactsSample
} from '$modules/appointments/api/appointment/appointment.sample';
import { ApiError } from '$shared/lib/http';
import {
	readAppointmentChangeFailure,
	type AppointmentChangeFailureFacts
} from '$modules/appointments/api/appointment';
import { bookingPatientSample } from '$modules/appointments/lib/booking/booking.sample';
import {
	appointmentChangeOpen,
	appointmentOfficeDay,
	appointmentRescheduleOffice,
	asksFirstVisitOnChange,
	buildAppointmentContext,
	buildTimeDiff,
	buildVisitorOptions,
	changeRefusalRereads,
	currentVisitorId,
	firstVisitCopy,
	insideCutoffMessage,
	isLastReschedule,
	moveAsksCutoffYes,
	noteChangeDone,
	pendingLimitBlocks,
	readChangeOutcome,
	resolveRescheduleServiceId,
	toNoteChangeRequest,
	toTimeChangeRequest,
	toVisitorChangeRequest,
	withoutAppointmentHours
} from '.';

const line = (doctorServiceId: string, durationInMinutes: number | null, isActive: boolean) => ({
	doctorServiceId,
	durationInMinutes,
	isActive
});

describe('screen 52 · the hour (U-136, P-W4 §4.3)', () => {
	it('the slots are read for the LONGEST ACTIVE line (the server’s patch); a removed line is ignored', () => {
		expect(
			resolveRescheduleServiceId([
				line('s-simple', 30, true),
				line('s-scope', 45, false),
				line('s-check', 40, true)
			])
		).toBe('s-check');
		expect(resolveRescheduleServiceId([line('s-gone', 60, false)])).toBe('');
		expect(resolveRescheduleServiceId([])).toBe('');
	});

	it('«Ήταν / Νέα ώρα» on the office’s clock, and what stays of the state', () => {
		expect(buildTimeDiff(appointmentFactsSample, '2026-11-13T08:00:00.000Z', 'el')).toEqual({
			was: 'Πέμπτη 12 Νοεμβρίου · 12:30',
			next: 'Παρασκευή 13 Νοεμβρίου · 10:00',
			stays: 'Το ραντεβού μένει επιβεβαιωμένο. Ο γιατρός ενημερώνεται για τη νέα ώρα.'
		});
		expect(
			buildTimeDiff(
				{ ...appointmentFactsSample, status: 'pending' },
				'2026-11-13T08:00:00.000Z',
				'el'
			).stays
		).toBe('Το αίτημα μένει σε αναμονή μέχρι να απαντήσει ο γιατρός.');
	});

	it('🔴 P-B4 §13.3.3: «τελευταία αλλαγή» only while a move is allowed and exactly one is left', () => {
		expect(isLastReschedule({ ...appointmentActionsSample, reschedulesLeft: 1 })).toBe(true);
		expect(isLastReschedule({ ...appointmentActionsSample, reschedulesLeft: 2 })).toBe(false);
		expect(isLastReschedule({ ...appointmentActionsSample, reschedulesLeft: 0 })).toBe(false);
		expect(
			isLastReschedule({ ...appointmentActionsSample, reschedulesLeft: 1, canReschedule: false })
		).toBe(false);
		expect(isLastReschedule({ ...appointmentActionsSample, reschedulesLeft: null })).toBe(false);
		expect(isLastReschedule(null)).toBe(false);
	});

	it('U-136.4: the «yes» asked in the screen, the hour in passing; the write is the instant, the «yes» only when given', () => {
		expect(insideCutoffMessage(appointmentFactsSample, '2026-11-12T08:00:00.000Z', 'el')).toBe(
			'Για τις Πέμ 12 Νοε · 10:00 η προθεσμία ακύρωσης έχει ήδη περάσει: αν αλλάξετε ώρα, θα μπορείτε να την ακυρώσετε μόνο τηλεφωνικά με το ιατρείο.'
		);
		expect(toTimeChangeRequest('2026-11-12T08:00:00.000Z', false)).toEqual({
			startTime: '2026-11-12T08:00:00.000Z'
		});
		expect(toTimeChangeRequest('2026-11-12T08:00:00.000Z', true)).toEqual({
			startTime: '2026-11-12T08:00:00.000Z',
			acknowledgeInsideCancellationCutoff: true
		});
	});

	it('🔴 D-W4-67: the page foresees the server’s question (`patientMoveNeedsCutoffAcknowledgement`) — a kept visit moved to an hour whose deadline, by the appointment’s own hours, is already behind the server’s now', () => {
		const now = Date.parse('2026-11-10T19:00:00.000Z');
		const kept = { status: 'booked' as const, actions: appointmentActionsSample };
		expect(appointmentActionsSample.cancellationCutoffHours).toBe(24);
		// 13 hours ahead: its deadline passed 11 hours ago.
		expect(moveAsksCutoffYes(kept, '2026-11-11T08:00:00.000Z', now)).toBe(true);
		// One millisecond inside the 24 hours.
		expect(moveAsksCutoffYes(kept, '2026-11-11T18:59:59.999Z', now)).toBe(true);
		// 61 hours ahead.
		expect(moveAsksCutoffYes(kept, '2026-11-13T08:00:00.000Z', now)).toBe(false);
	});

	it('D-W4-67 (negative): exactly on the deadline is on time (D-19); a request is never asked (A1); no hours known, an hour that is no instant ⇒ the server decides', () => {
		const now = Date.parse('2026-11-10T19:00:00.000Z');
		const near = '2026-11-11T08:00:00.000Z';
		const kept = { status: 'booked' as const, actions: appointmentActionsSample };
		expect(moveAsksCutoffYes(kept, '2026-11-11T19:00:00.000Z', now)).toBe(false);
		expect(moveAsksCutoffYes({ ...kept, status: 'pending' }, near, now)).toBe(false);
		expect(moveAsksCutoffYes({ ...kept, status: 'checked_in' }, near, now)).toBe(false);
		expect(
			moveAsksCutoffYes(
				{ ...kept, actions: { ...appointmentActionsSample, cancellationCutoffHours: null } },
				near,
				now
			)
		).toBe(false);
		expect(moveAsksCutoffYes({ ...kept, actions: null }, near, now)).toBe(false);
		expect(moveAsksCutoffYes(kept, 'tomorrow', now)).toBe(false);
		expect(moveAsksCutoffYes(kept, near, Number.NaN)).toBe(false);
		// A cutoff of no hours: the deadline is the start itself, behind «now» only once the hour began.
		const none = { ...kept, actions: { ...appointmentActionsSample, cancellationCutoffHours: 0 } };
		expect(moveAsksCutoffYes(none, near, now)).toBe(false);
	});
});

describe('screen 52 · the person and the note', () => {
	const forRelative = {
		...appointmentFactsSample,
		relativeId: 'rel-gone',
		snapshot: {
			...appointmentFactsSample.snapshot,
			visitor: { kind: 'relative' as const, name: 'Γιώργος Παππάς' }
		},
		relative: {
			relativeId: 'rel-gone',
			firstName: 'Γιώργος',
			lastName: 'Παππάς',
			relationship: 'CHILD',
			gender: 'MALE'
		}
	};

	it('the booking’s ONE builder; record §11.4: a relative deleted since stays on the list, from the snapshot', () => {
		expect(currentVisitorId(appointmentFactsSample)).toBe('self');
		expect(currentVisitorId(forRelative)).toBe('rel-gone');
		const options = buildVisitorOptions(bookingPatientSample, forRelative, 'el');
		expect(options.map((option) => [option.id, option.label, option.description])).toEqual([
			['self', 'Για μένα', 'Ελένη Παππά'],
			['rel-1', 'Πέτρος Μάρκου', 'Γιος'],
			['rel-gone', 'Γιώργος Παππάς', 'Γιος']
		]);
		expect(buildVisitorOptions(bookingPatientSample, appointmentFactsSample, 'el')).toHaveLength(2);
	});

	it('🔴 «first visit?» only when the person changes and the server knows no earlier visit (D-W3-22)', () => {
		expect(asksFirstVisitOnChange(true, { firstVisitKnown: false })).toBe(true);
		expect(asksFirstVisitOnChange(false, { firstVisitKnown: false })).toBe(false);
		expect(asksFirstVisitOnChange(true, { firstVisitKnown: true })).toBe(false);
		expect(asksFirstVisitOnChange(true, { firstVisitKnown: null })).toBe(false);
		expect(asksFirstVisitOnChange(true, undefined)).toBe(false);
	});

	it('D-70: the pending limit only for a request handed to another person; a kept visit is never refused by it', () => {
		const pending = { status: 'pending' as const };
		expect(pendingLimitBlocks(pending, true, ['PATIENT_PENDING_LIMIT_REACHED'])).toBe(true);
		expect(pendingLimitBlocks(pending, false, ['PATIENT_PENDING_LIMIT_REACHED'])).toBe(false);
		expect(pendingLimitBlocks({ status: 'booked' }, true, ['PATIENT_PENDING_LIMIT_REACHED'])).toBe(
			false
		);
		expect(pendingLimitBlocks(pending, true, undefined)).toBe(false);
	});

	it('the person’s write names who, and `firstVisit` only when asked; the note trimmed, cut, `null` when empty', () => {
		expect(toVisitorChangeRequest({ kind: 'self' }, null)).toEqual({
			bookedForType: 'SELF',
			relativeId: null
		});
		expect(toVisitorChangeRequest({ kind: 'relative', relativeId: 'rel-1' }, false)).toEqual({
			bookedForType: 'RELATIVE',
			relativeId: 'rel-1',
			firstVisit: false
		});
		expect(toNoteChangeRequest('  Φέρνω εξετάσεις.  ')).toEqual({
			patientNote: 'Φέρνω εξετάσεις.'
		});
		expect(toNoteChangeRequest('   ')).toEqual({ patientNote: null });
		expect([
			...(toNoteChangeRequest('α'.repeat(600)) as { patientNote: string }).patientNote
		]).toHaveLength(500);
	});
});

describe('screen 52 · a refused change in the screen’s terms', () => {
	const failure = (
		kind: AppointmentChangeFailureFacts['kind'],
		blockers: AppointmentChangeFailureFacts['blockers'] = []
	): AppointmentChangeFailureFacts => ({ kind, status: 422, blockers });

	it('U-136.4: the hour inside the cutoff asks the «yes» in the screen; a taken hour says so; 🔴 D-W4-37.1: closed / changed say D-W4-35 and the screen stays', () => {
		expect(
			readChangeOutcome(failure('blocked', ['RESCHEDULE_INSIDE_CANCELLATION_CUTOFF']), 'el')
		).toEqual({
			kind: 'inside-cutoff'
		});
		expect(readChangeOutcome(failure('slot-unavailable'), 'el')).toEqual({
			kind: 'slot-gone',
			message: 'Αυτή η ώρα δεν είναι πλέον διαθέσιμη.'
		});
		expect(readChangeOutcome(failure('blocked', ['EXTERNAL_CALENDAR_BUSY']), 'el').kind).toBe(
			'slot-gone'
		);
		// Review w4-w5 R1 MAJOR-1: a `403` / `404` that names nothing (closed meanwhile, or a relative deleted) and the
		// `409` «changed concurrently» are refusals with no known reason — never a silent way back.
		const unsaved = 'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.';
		expect(readChangeOutcome(failure('closed'), 'el')).toEqual({
			kind: 'refused',
			message: unsaved
		});
		expect(readChangeOutcome(failure('changed'), 'el')).toEqual({
			kind: 'refused',
			message: unsaved
		});
		expect(readChangeOutcome(failure('session'), 'el')).toEqual({ kind: 'session' });
	});

	it('🔴 review w4-a6 R1 MINOR-1 (parity, D-W4-37.1): a `400` / `422` that names no known code (`invalid`) and an answer nobody decided (`unknown`) are refusals with no known reason — D-W4-35’s words, never the booking’s; and the appointment is read again', () => {
		const unsaved = 'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.';
		for (const kind of ['invalid', 'unknown'] as const) {
			const outcome = readChangeOutcome(failure(kind), 'el');
			expect(outcome, kind).toEqual({ kind: 'refused', message: unsaved });
			expect(changeRefusalRereads(outcome), kind).toBe(true);
		}
		// What the server really sends, read whole: an unknown code under 422, no field under 400.
		for (const refused of [
			new ApiError('Validation Error: SOME_NEW_CODE', 422, '/appointment/appointments/a-1'),
			new ApiError('Invalid input', 400, '/appointment/appointments/a-1')
		]) {
			const facts = readAppointmentChangeFailure(refused);
			expect(facts).toMatchObject({ kind: 'invalid', blockers: [] });
			expect(readChangeOutcome(facts, 'el')).toEqual({ kind: 'refused', message: unsaved });
		}
	});

	it('🔴 D-W4-37.1 / .3: every answer of the server reads the appointment again — a code or none; (negative) not the session, not the «yes» it asks', () => {
		for (const kind of [
			'closed',
			'changed',
			'unknown',
			'slot-unavailable',
			'rate-limited'
		] as const) {
			expect(changeRefusalRereads(readChangeOutcome(failure(kind), 'el')), kind).toBe(true);
		}
		for (const code of [
			'RESCHEDULE_AFTER_CANCELLATION_CUTOFF',
			'PATIENT_RESCHEDULE_LIMIT_REACHED',
			'PATIENT_PENDING_LIMIT_REACHED'
		] as const) {
			expect(changeRefusalRereads(readChangeOutcome(failure('blocked', [code]), 'el')), code).toBe(
				true
			);
		}
		expect(changeRefusalRereads(readChangeOutcome(failure('session'), 'el'))).toBe(false);
		expect(
			changeRefusalRereads(
				readChangeOutcome(failure('blocked', ['RESCHEDULE_INSIDE_CANCELLATION_CUTOFF']), 'el')
			)
		).toBe(false);
	});

	it('the booking’s words for the other codes; too many writes; 🔴 D-W4-35 (negative) nothing known ⇒ «Η αλλαγή δεν αποθηκεύτηκε…», never the booking’s', () => {
		expect(
			readChangeOutcome(failure('blocked', ['RESCHEDULE_AFTER_CANCELLATION_CUTOFF']), 'el')
		).toEqual({
			kind: 'refused',
			message: 'Η ώρα δεν αλλάζει πια τόσο κοντά στο ραντεβού.'
		});
		expect(
			readChangeOutcome(failure('blocked', ['PATIENT_RESCHEDULE_LIMIT_REACHED']), 'el').kind
		).toBe('refused');
		expect(readChangeOutcome(failure('blocked', ['PATIENT_PENDING_LIMIT_REACHED']), 'el')).toEqual({
			kind: 'refused',
			message: 'Υπάρχει ήδη ένα αίτημα σε αναμονή για το ίδιο πρόσωπο σε αυτόν τον επαγγελματία.'
		});
		expect(readChangeOutcome(failure('rate-limited'), 'el')).toEqual({
			kind: 'refused',
			message: 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		});
		expect(readChangeOutcome(failure('unknown'), 'el')).toEqual({
			kind: 'refused',
			message: 'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		});
		expect(readChangeOutcome(failure('invalid'), 'en')).toEqual({
			kind: 'refused',
			message: 'The change was not saved. Check your connection and try again.'
		});
		expect(JSON.stringify(readChangeOutcome(failure('unknown'), 'el'))).not.toMatch(/κράτηση/u);
	});
});

const maria = {
	doctorSlug: 'dr-maria',
	name: 'Μαρία Τριανταφύλλου',
	professional: { name: 'Δερματολόγος' },
	images: [{ url: '/maria.jpg', thumbUrl: '/maria-thumb.jpg', alt: '' }],
	rating: 4.9,
	reviewCount: 22
};

describe('screen 52 · the box «Το ραντεβού σας», when a screen opens, the hours (record §8.2)', () => {
	it('«Το ραντεβού σας» / «Το αίτημά σας», the day and the hour, «Dr. … · service · length», the street and the city; «Για: …» only when asked', () => {
		expect(
			buildAppointmentContext({ appointment: appointmentFactsSample, doctor: maria, locale: 'el' })
		).toEqual({
			label: 'Το ραντεβού σας',
			when: 'Πέμπτη 12 Νοεμβρίου · 12:30',
			line: 'Dr. Μαρία Τριανταφύλλου · Απλή επίσκεψη · 30 λεπτά',
			address: 'Ερμού 101, Αθήνα',
			forWhom: null,
			photo: { url: '/maria-thumb.jpg', alt: '' }
		});
		const forSon = {
			...appointmentFactsSample,
			status: 'pending' as const,
			snapshot: {
				...appointmentFactsSample.snapshot,
				visitor: { kind: 'relative' as const, name: 'Γιώργος Παππάς' }
			},
			relative: {
				relativeId: 'rel-1',
				firstName: 'Γιώργος',
				lastName: 'Παππάς',
				relationship: 'CHILD',
				gender: 'MALE'
			}
		};
		expect(
			buildAppointmentContext({
				appointment: forSon,
				doctor: undefined,
				withVisitor: true,
				locale: 'el'
			})
		).toMatchObject({
			label: 'Το αίτημά σας',
			line: 'Απλή επίσκεψη · 30 λεπτά',
			forWhom: 'Για: Γιώργος Παππάς (γιος)',
			photo: null
		});
		// Screen 54 (`appt.js:309`): a visit that took place is «Η επίσκεψή σας»; a canceled one stays «Το ραντεβού σας».
		const visited = { ...appointmentFactsSample, status: 'completed' as const };
		expect(
			buildAppointmentContext({ appointment: visited, doctor: maria, locale: 'el' }).label
		).toBe('Η επίσκεψή σας');
		expect(
			buildAppointmentContext({ appointment: visited, doctor: maria, locale: 'en' }).label
		).toBe('Your visit');
		const canceled = { ...appointmentFactsSample, status: 'canceled' as const };
		expect(
			buildAppointmentContext({ appointment: canceled, doctor: maria, locale: 'el' }).label
		).toBe('Το ραντεβού σας');
	});

	it('🔴 D-W4-01: the hour while `canReschedule`; the person and the note while pending or booked (no deadline); (negative) a closed visit opens none', () => {
		const booked = { status: 'booked' as const, actions: appointmentActionsSample };
		expect(appointmentChangeOpen('time', booked)).toBe(true);
		expect(appointmentChangeOpen('note', booked)).toBe(true);
		const spent = { ...booked, actions: { ...appointmentActionsSample, canReschedule: false } };
		expect(appointmentChangeOpen('time', spent)).toBe(false);
		expect(appointmentChangeOpen('for-whom', spent)).toBe(true);
		expect(appointmentChangeOpen('relative', spent)).toBe(true);
		const canceled = { status: 'canceled' as const, actions: spent.actions };
		for (const step of ['time', 'for-whom', 'relative', 'note'] as const) {
			expect(appointmentChangeOpen(step, canceled)).toBe(false);
		}
	});

	it('the hours: the appointment’s own office (no office to pick), its day on the office’s calendar; its own hour and a taken one leave the grid', () => {
		expect(appointmentRescheduleOffice(appointmentFactsSample)).toEqual({
			officeId: 'off-ermou',
			street: 'Ερμού',
			streetNumber: '101',
			city: 'Αθήνα',
			state: 'Αττική'
		});
		expect(appointmentRescheduleOffice({ officeId: 'off-x', office: null })).toEqual({
			officeId: 'off-x',
			street: undefined,
			streetNumber: undefined,
			city: undefined,
			state: undefined
		});
		// 23:30 on the 11th in Athens is the 11th there, the 11th's 21:30 in UTC.
		expect(
			appointmentOfficeDay({
				startTime: '2026-11-11T21:30:00.000Z',
				officeTimeZone: 'Europe/Athens'
			})
		).toBe('2026-11-11');
		expect(appointmentOfficeDay({ startTime: 'later', officeTimeZone: 'Europe/Athens' })).toBe(
			undefined
		);
		const window = {
			officeId: 'off-ermou',
			timezone: 'Europe/Athens',
			days: [
				{
					date: '2026-11-12',
					slots: [
						{ startMinute: 600, startTime: '2026-11-12T08:00:00.000Z' },
						{ startMinute: 750, startTime: '2026-11-12T10:30:00.000Z' }
					]
				},
				{ date: '2026-11-13', slots: [{ startMinute: 600, startTime: '2026-11-13T08:00:00.000Z' }] }
			]
		};
		const left = withoutAppointmentHours(window, [
			'2026-11-12T10:30:00.000Z',
			'2026-11-13T08:00:00Z'
		]);
		expect(left).toEqual({
			officeId: 'off-ermou',
			timezone: 'Europe/Athens',
			days: [
				{
					date: '2026-11-12',
					slots: [{ startMinute: 600, startTime: '2026-11-12T08:00:00.000Z' }]
				},
				{ date: '2026-11-13', slots: [] }
			]
		});
		expect(withoutAppointmentHours(window, [])).toEqual(window);
	});

	it('«Είναι το πρώτο ραντεβού με Dr. …;» and whom the answer is about; a note saved or removed', () => {
		expect(firstVisitCopy(maria, 'Γιώργος Παππάς', 'el')).toEqual({
			title: 'Είναι το πρώτο ραντεβού με Dr. Μαρία Τριανταφύλλου;',
			about: 'Η απάντηση αφορά: Γιώργος Παππάς.'
		});
		expect(firstVisitCopy(null, null, 'el').about).toBeUndefined();
		expect(noteChangeDone(toNoteChangeRequest('  Νέα σημείωση ')).removed).toBe(false);
		expect(noteChangeDone(toNoteChangeRequest('   '))).toEqual({ kind: 'note', removed: true });
	});
});

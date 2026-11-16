import { describe, expect, it } from 'vitest';
import {
	doctorAppointmentDetailFacts,
	doctorRequestForRelativeRow,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import { mapDoctorAppointmentDetail } from '$modules/doctor-dashboard/api/appointments';
import { DOCTOR_REASON_TEXT_MAX_LENGTH } from '$modules/doctor-dashboard/config';
import {
	buildDoctorReasonContext,
	clampDoctorReasonText,
	doctorReasonCopy,
	doctorReasonCounter,
	doctorReasonEntry,
	doctorReasonOptions,
	doctorReasonSoon,
	doctorReasonThenLines,
	isDoctorReason,
	toDoctorCancelRequest,
	toDoctorRejectRequest
} from '.';

const NBSP = '\u00a0';
const MINUTE = 60_000;
const request = () => {
	const facts = mapDoctorAppointmentDetail(doctorRequestForRelativeRow());
	if (!facts) throw new Error('sample request unreadable');
	return facts;
};
const keptAt = (offsetMs: number, patch: Parameters<typeof doctorAppointmentDetailFacts>[0] = {}) =>
	doctorAppointmentDetailFacts({
		startTime: new Date(TODAY_NOW + offsetMs).toISOString(),
		...patch
	});

describe('screen 69 in words (D-W51-47, card w51-w5)', () => {
	it('the reasons of the server’s lists, in its order, in the doctor’s words (the application’s); the words of each step', () => {
		expect(doctorReasonOptions('reject', 'el')).toEqual([
			{ value: 'DOCTOR_UNAVAILABLE', label: 'Δεν είμαι διαθέσιμος/η' },
			{ value: 'SLOT_TAKEN', label: 'Η ώρα είναι πιασμένη' },
			{ value: 'NEEDS_DIFFERENT_SERVICE', label: 'Χρειάζεται άλλη υπηρεσία' },
			{ value: 'OTHER', label: 'Άλλος λόγος' }
		]);
		expect(doctorReasonOptions('cancel', 'el').map((option) => option.label)).toEqual([
			'Δεν είμαι διαθέσιμος/η',
			'Έκτακτο περιστατικό',
			'Άλλος λόγος'
		]);
		expect(doctorReasonOptions('cancel', 'en').map((option) => option.label)).toEqual([
			'I am not available',
			'Emergency',
			'Other reason'
		]);
		expect(doctorReasonCopy('reject', 'el')).toMatchObject({
			title: 'Απόρριψη αιτήματος',
			context: 'Το αίτημα',
			done: 'Το αίτημα απορρίφθηκε. Ο ασθενής ενημερώνεται.'
		});
		expect(doctorReasonCopy('cancel', 'el')).toMatchObject({
			title: 'Ακύρωση ραντεβού',
			context: 'Το ραντεβού',
			done: 'Το ραντεβού ακυρώθηκε. Ο ασθενής ενημερώνεται.'
		});
		expect(doctorReasonThenLines('reject', 'el')).toEqual([
			'Ο ασθενής ενημερώνεται αμέσως και βλέπει τον λόγο και το μήνυμά σας.',
			'Η ώρα ελευθερώνεται για άλλους ασθενείς.',
			'Η απόρριψη δεν αναιρείται.'
		]);
		expect(doctorReasonThenLines('cancel', 'el')[2]).toBe('Η ακύρωση δεν αναιρείται.');
	});

	it('U-65.6 (negative): only a code of the step’s own list travels — never the patient’s, the other step’s, a made-up one', () => {
		expect(isDoctorReason('reject', 'SLOT_TAKEN')).toBe(true);
		expect(isDoctorReason('cancel', 'EMERGENCY')).toBe(true);
		for (const value of ['EMERGENCY', 'PERSONAL', 'slot_taken', '', '<script>', null, 7]) {
			expect(isDoctorReason('reject', value), String(value)).toBe(false);
		}
		for (const value of ['SLOT_TAKEN', 'NEEDS_DIFFERENT_SERVICE', 'PERSONAL', 'FEELING_BETTER']) {
			expect(isDoctorReason('cancel', value), value).toBe(false);
		}
		expect(toDoctorRejectRequest('PERSONAL', 'x')).toBeNull();
		expect(toDoctorCancelRequest('SLOT_TAKEN', 'x')).toBeNull();
	});

	it('🔴 U-65.6 / D-W51-34: the words trimmed, left out when blank, cut at the contract’s 500 (never half an emoji); «n/500»', () => {
		expect(DOCTOR_REASON_TEXT_MAX_LENGTH).toBe(500);
		expect(toDoctorRejectRequest('OTHER', '  Λυπάμαι.  ')).toEqual({
			reasonCode: 'OTHER',
			message: 'Λυπάμαι.'
		});
		expect(toDoctorRejectRequest('OTHER', '   ')).toEqual({ reasonCode: 'OTHER' });
		expect(toDoctorCancelRequest('EMERGENCY', '')).toEqual({ reasonCode: 'EMERGENCY' });
		expect(toDoctorCancelRequest('EMERGENCY', 'Χειρουργείο.')).toEqual({
			reasonCode: 'EMERGENCY',
			reasonText: 'Χειρουργείο.'
		});
		const long = 'α'.repeat(501);
		expect(toDoctorRejectRequest('OTHER', long)?.message).toHaveLength(500);
		expect(toDoctorCancelRequest('OTHER', long)?.reasonText).toHaveLength(500);
		expect(clampDoctorReasonText('α'.repeat(500))).toHaveLength(500);
		expect(clampDoctorReasonText(`${'α'.repeat(499)}😀`)).toHaveLength(499);
		expect(doctorReasonCounter('', 'el')).toBe('0/500');
		expect(doctorReasonCounter(long, 'el')).toBe('500/500');
		// HTML is words like any other: it travels as written (the server keeps it as text, w51-b5).
		expect(toDoctorRejectRequest('OTHER', '<b>x</b>')).toEqual({
			reasonCode: 'OTHER',
			message: '<b>x</b>'
		});
	});

	it('🔴 D-W51-48: the form only while the server allows the step — a request is refused, a kept one canceled; else «δεν γίνεται πια»', () => {
		const pending = request();
		expect(doctorReasonEntry(pending, 'reject')).toBe('form');
		// The server would cancel a request too (`canCancel`), but the doctor refuses it (`sw.js:438`).
		expect(pending.actions.canCancel).toBe(true);
		expect(doctorReasonEntry(pending, 'cancel')).toBe('closed');
		const booked = doctorAppointmentDetailFacts({ actions: { canCancel: true } });
		expect(doctorReasonEntry(booked, 'cancel')).toBe('form');
		expect(doctorReasonEntry(booked, 'reject')).toBe('closed');
		const over = doctorAppointmentDetailFacts({
			status: 'completed',
			actions: { canCancel: false }
		});
		expect(doctorReasonEntry(over, 'cancel')).toBe('closed');
		expect(
			doctorReasonEntry({ ...pending, actions: { ...pending.actions, canReject: false } }, 'reject')
		).toBe('closed');
	});

	it('🔴 D-W51-47 «είναι κοντά»: a cancellation under 24 hours ahead on the server’s clock, with the booker’s mobile; never a refusal, never past, never a day away', () => {
		expect(doctorReasonSoon(keptAt(20 * MINUTE), 'cancel', TODAY_NOW, 'el')).toEqual({
			text: 'Το ραντεβού είναι σε 20 λεπτά.',
			call: { label: ['+30', '697', '765', '4321'].join(NBSP), dial: '+306977654321' }
		});
		expect(doctorReasonSoon(keptAt(5 * 60 * MINUTE), 'cancel', TODAY_NOW, 'el')?.text).toBe(
			'Το ραντεβού είναι σε 5 ώρες.'
		);
		expect(doctorReasonSoon(keptAt(20 * MINUTE), 'cancel', TODAY_NOW, 'en')?.text).toBe(
			'The appointment is in 20 minutes.'
		);
		expect(doctorReasonSoon(keptAt(24 * 60 * MINUTE), 'cancel', TODAY_NOW, 'el')).toBeNull();
		expect(doctorReasonSoon(keptAt(-5 * MINUTE), 'cancel', TODAY_NOW, 'el')).toBeNull();
		expect(doctorReasonSoon(keptAt(20 * MINUTE), 'reject', TODAY_NOW, 'el')).toBeNull();
		// A relative's visit: the one who booked is called; without any mobile, the sentence alone.
		const forRelative = request();
		expect(
			doctorReasonSoon({ ...forRelative, status: 'booked' }, 'cancel', TODAY_NOW, 'el')?.call?.dial
		).toBe('+306941234567');
		const silent = keptAt(20 * MINUTE);
		expect(
			doctorReasonSoon(
				{ ...silent, patient: { ...silent.patient, phone: null } },
				'cancel',
				TODAY_NOW,
				'el'
			)
		).toEqual({ text: 'Το ραντεβού είναι σε 20 λεπτά.', call: null });
	});

	it('the box (`sw.js:470`): the step’s word, «day · time», «name · service · length», the street — the relative named, never the booker', () => {
		expect(buildDoctorReasonContext(request(), 'reject', 'el')).toEqual({
			label: 'Το αίτημα',
			title: 'Σάββατο 14 Νοεμβρίου · 17:30',
			lines: ['Νίκος Μαυρίδης · Επίσκεψη · 30 λεπτά', 'Πατησίων 45'],
			name: 'Νίκος Μαυρίδης'
		});
		const kept = buildDoctorReasonContext(doctorAppointmentDetailFacts(), 'cancel', 'en');
		expect(kept.label).toBe('The appointment');
		expect(kept.name).toBe('Ιωάννα Καρρά');
		expect(kept.lines[1]).toBe('Patision 45');
	});
});

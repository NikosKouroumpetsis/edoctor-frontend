import { describe, expect, it } from 'vitest';
import { createForm } from '$shared/lib/form';
import {
	appointmentActionsSample,
	appointmentFactsSample
} from '$modules/appointments/api/appointment/appointment.sample';
import {
	buildCancelTerms,
	cancelCopy,
	cancelEntryOf,
	cancelFormRules,
	cancelMessageCounter,
	cancelReasonLabel,
	cancelReasonOptions,
	cancelThenLines,
	clampCancelMessage,
	isPatientCancelReason,
	readCancelOutcome,
	toCancelRequest
} from '.';

const booked = appointmentFactsSample;
const pending = { ...appointmentFactsSample, status: 'pending' as const };

describe('screen 53 · «Προθεσμία ακύρωσης» (P-B4 §13.3.2, as written)', () => {
	it('a kept visit: «Έως {the instant} · Ακυρώνετε από εδώ.» and «Μετά · Μόνο τηλεφωνικά …»', () => {
		expect(
			buildCancelTerms({
				appointment: booked,
				actions: appointmentActionsSample,
				phone: '210 321 0101',
				locale: 'el'
			})
		).toEqual({
			title: 'Προθεσμία ακύρωσης',
			lines: [
				{ title: 'Έως Τετάρτη 11 Νοεμβρίου, 12:30', body: 'Ακυρώνετε από εδώ.' },
				{ title: 'Μετά', body: 'Μόνο τηλεφωνικά με το ιατρείο · 210 321 0101' }
			]
		});
	});

	it('a request always «Έως την ώρα του ραντεβού · Ακυρώνετε το αίτημα από εδώ.», whatever its deadline', () => {
		expect(
			buildCancelTerms({
				appointment: pending,
				actions: appointmentActionsSample,
				phone: '210',
				locale: 'el'
			}).lines
		).toEqual([{ title: 'Έως την ώρα του ραντεβού', body: 'Ακυρώνετε το αίτημα από εδώ.' }]);
	});

	it('a kept visit the doctor put inside its deadline (`cancellationDeadline === startTime`): «… επειδή ο γιατρός άλλαξε την ώρα …»', () => {
		const inside = { ...booked, startTime: '2026-11-11T08:00:00.000Z' };
		expect(
			buildCancelTerms({
				appointment: inside,
				actions: { ...appointmentActionsSample, cancellationDeadline: '2026-11-11T08:00:00.000Z' },
				phone: '210',
				locale: 'el'
			}).lines
		).toEqual([
			{
				title: 'Έως την ώρα του ραντεβού',
				body: 'Ακυρώνετε από εδώ, επειδή ο γιατρός άλλαξε την ώρα μέσα στην προθεσμία.'
			}
		]);
	});

	it('(negative) an answer without the instant: «Ακύρωση έως N ώρες πριν»; no phone, no «Μετά»; no actions, nothing invented', () => {
		const noInstant = { ...appointmentActionsSample, cancellationDeadline: null };
		expect(
			buildCancelTerms({ appointment: booked, actions: noInstant, phone: null, locale: 'el' }).lines
		).toEqual([{ title: 'Ακύρωση έως 24 ώρες πριν', body: 'Ακυρώνετε από εδώ.' }]);
		expect(
			buildCancelTerms({
				appointment: booked,
				actions: { ...noInstant, cancellationCutoffHours: 1 },
				phone: null,
				locale: 'el'
			}).lines[0]?.title
		).toBe('Ακύρωση έως 1 ώρα πριν');
		expect(
			buildCancelTerms({ appointment: booked, actions: null, phone: null, locale: 'el' }).lines
		).toEqual([]);
	});
});

describe('screen 53 · the reasons, the words, the body', () => {
	it('the patient’s five in the server’s order; a doctor’s reason is read but never offered', () => {
		expect(cancelReasonOptions('el').map((option) => option.label)).toEqual([
			'Δεν με βολεύει η ώρα',
			'Αισθάνομαι καλύτερα',
			'Βρήκα άλλον γιατρό',
			'Προσωπικοί λόγοι',
			'Άλλος λόγος'
		]);
		expect(cancelReasonLabel('EMERGENCY', 'el')).toBe('Έκτακτο περιστατικό');
		expect(isPatientCancelReason('EMERGENCY')).toBe(false);
	});

	it('(negative) a code this build does not know is no words, never the code; nor a prototype’s key', () => {
		expect(cancelReasonLabel('LATE', 'el')).toBeNull();
		expect(cancelReasonLabel('constructor', 'el')).toBeNull();
		expect(cancelReasonLabel(null, 'el')).toBeNull();
	});

	it('U-137.1: the words trimmed and cut to 500 (🔴 D-W4-36.8: UTF-16 units, an emoji whole), left out when blank; a reason not of the five is no body', () => {
		expect(toCancelRequest('PERSONAL', '  Δεν προλαβαίνω.  ')).toEqual({
			reasonCode: 'PERSONAL',
			reasonText: 'Δεν προλαβαίνω.'
		});
		expect(toCancelRequest('OTHER', '   ')).toEqual({ reasonCode: 'OTHER' });
		const long = toCancelRequest('OTHER', '😀'.repeat(501) + 'x');
		expect(long?.reasonText).toBe('😀'.repeat(250));
		expect(toCancelRequest('OTHER', 'α'.repeat(800))?.reasonText).toHaveLength(500);
		expect(toCancelRequest('EMERGENCY', 'x')).toBeNull();
		expect(toCancelRequest('', 'x')).toBeNull();
	});

	it('U-137.4: a request says «αίτημα»; D-W4-11: «Θα λάβετε email…» only with an email; U-137.5: no «εκπρόθεσμ» anywhere', () => {
		expect(cancelCopy(pending, 'el')).toMatchObject({
			title: 'Ακύρωση αιτήματος',
			submit: 'Ακύρωση αιτήματος',
			offerBody: 'Αλλάξτε την ώρα και το αίτημα μένει.'
		});
		expect(cancelCopy(booked, 'el')).toMatchObject({
			title: 'Ακύρωση ραντεβού',
			keep: 'Να μείνει'
		});
		expect(cancelThenLines(booked, 'el')).toHaveLength(4);
		expect(cancelThenLines({ patientHasEmail: false }, 'el')).not.toContain(
			'Θα λάβετε email επιβεβαίωσης.'
		);
		expect(cancelThenLines(booked, 'en')).toContain('The time opens up for other patients.');
		const everything = JSON.stringify([cancelCopy(pending, 'el'), cancelThenLines(booked, 'el')]);
		expect(everything).not.toMatch(/εκπρόθεσμ/u);
	});

	it('a refusal in the screen’s terms: the deadline view, the session, «Πολλές προσπάθειες…», else «Η ακύρωση δεν ολοκληρώθηκε…»', () => {
		const failure = (
			kind: Parameters<typeof readCancelOutcome>[0]['kind'],
			blockers: string[] = []
		) => ({ kind, status: 403, blockers }) as Parameters<typeof readCancelOutcome>[0];
		expect(
			readCancelOutcome(failure('blocked', ['CANCEL_AFTER_CANCELLATION_CUTOFF']), 'el')
		).toEqual({
			kind: 'deadline'
		});
		// Review w4-w3 R1 MINOR-1 (negative): a `403` with no code (refused or expired meanwhile) is no deadline; 🔴
		// D-W4-37.1 (review w4-w5 R1 MAJOR-1): it is a failure the patient reads, staying with the reason and the words
		// (the screen reads the appointment again); a `409` «changed concurrently» the same.
		const failed = {
			kind: 'failed',
			message: 'Η ακύρωση δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		};
		expect(readCancelOutcome(failure('closed'), 'el')).toEqual(failed);
		expect(readCancelOutcome(failure('changed'), 'el')).toEqual(failed);
		expect(readCancelOutcome(failure('closed'), 'el')).not.toEqual({ kind: 'deadline' });
		expect(readCancelOutcome(failure('session'), 'el')).toEqual({ kind: 'session' });
		expect(readCancelOutcome(failure('rate-limited'), 'el')).toEqual({
			kind: 'failed',
			message: 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		});
		// Review w4-a6 R1 MINOR-1 (parity, D-W4-37.1): a `400` / `422` that names no known code is the same failure.
		expect(readCancelOutcome(failure('invalid'), 'el')).toEqual(failed);
		expect(readCancelOutcome(failure('unknown'), 'el')).toEqual({
			kind: 'failed',
			message: 'Η ακύρωση δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		});
	});
});

describe('screen 53 · its words (review w4-w5 R1 NIT-5: the cancel’s own bound, not the booking’s note)', () => {
	it('500 in UTF-16 units, never half an emoji; «N/500» in the units the server counts', () => {
		expect(clampCancelMessage('Ευχαριστώ.')).toBe('Ευχαριστώ.');
		expect(clampCancelMessage('α'.repeat(600))).toHaveLength(500);
		expect(clampCancelMessage('😀'.repeat(300))).toBe('😀'.repeat(250));
		expect(clampCancelMessage(`α${'😀'.repeat(300)}`)).toHaveLength(499);
		expect(cancelMessageCounter('', 'el')).toBe('0/500');
		expect(cancelMessageCounter('😀'.repeat(300), 'en')).toBe('500/500');
		expect(toCancelRequest('PERSONAL', `  ${'α'.repeat(600)}  `)?.reasonText).toHaveLength(500);
	});
});

describe('screen 53 · what it opens as (P-W4 §4.4, review w4-w3 R1 MINOR-1)', () => {
	it('the form while it may be canceled; «η προθεσμία έληξε» past the deadline; (negative) a closed visit is no deadline — the 51 tells how it ended', () => {
		expect(cancelEntryOf(appointmentActionsSample)).toBe('form');
		expect(cancelEntryOf({ canCancel: false, isPastCancellationCutoff: true })).toBe('deadline');
		expect(cancelEntryOf({ canCancel: false, isPastCancellationCutoff: false })).toBe('closed');
		// A request the doctor refused meanwhile: no `canCancel`, no deadline — never the deadline's view.
		expect(cancelEntryOf({ canCancel: false, isPastCancellationCutoff: false })).not.toBe(
			'deadline'
		);
	});
});

describe('screen 53 · the form’s rules for `createForm` (review w4-arch-frontend L-2, U-137.1, U-65.6)', () => {
	const form = () =>
		createForm({ initialValues: { reason: '', message: '' }, validators: cancelFormRules() });

	it('no reason yet: not valid (the button sleeps); one of the patient’s five with or without words: valid', () => {
		const empty = form();
		expect(empty.validate()).toBe(false);
		expect(empty.errors.reason).toBeDefined();
		expect(empty.errors.message).toBeUndefined();
		for (const { code } of cancelReasonOptions('el')) {
			empty.setValue('reason', code);
			expect(empty.validate(), code).toBe(true);
			expect(toCancelRequest(empty.values.reason, empty.values.message)).toEqual({
				reasonCode: code
			});
		}
	});

	it('(negative) a reason that is not the patient’s — the doctor’s own, a made-up one, a script — is no reason', () => {
		const filled = form();
		for (const bad of ['DOCTOR_UNAVAILABLE', 'nope', '<script>', ' ']) {
			filled.setValue('reason', bad);
			expect(isPatientCancelReason(bad), bad).toBe(false);
			expect(filled.validateField('reason'), bad).toBeDefined();
			expect(toCancelRequest(bad, '')).toBeNull();
		}
	});

	it('🔴 D-W4-36.8 (negative): the words within 500 UTF-16 units — 500 pass, 501 do not, 251 emoji (502 units) do not; what the field keeps (`clampCancelMessage`) always passes', () => {
		const filled = form();
		filled.setValue('reason', cancelReasonOptions('el')[0].code);
		filled.setValue('message', 'α'.repeat(500));
		expect(filled.validate()).toBe(true);
		filled.setValue('message', 'α'.repeat(501));
		expect(filled.validate()).toBe(false);
		filled.setValue('message', '😀'.repeat(251));
		expect(filled.validate()).toBe(false);
		filled.setValue('message', clampCancelMessage('😀'.repeat(251)));
		expect(filled.validate()).toBe(true);
	});
});

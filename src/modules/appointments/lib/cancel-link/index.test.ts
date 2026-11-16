import { describe, expect, it } from 'vitest';
import type { AppointmentCancelLinkFacts } from '$modules/appointments/api/cancel-link';
import {
	appointmentCancelLinkView,
	buildCancelLinkContext,
	buildCancelLinkTerms,
	cancelLinkFailureText,
	cancelLinkThenLines,
	readAppointmentCancelToken,
	toCancelLinkRequest
} from '.';

/* Wave 5.1 · the cancel link's page in words (D-W51-72, U-198.1; card w51-w8). Made-up doctor and office. */

const link = (patch: Partial<AppointmentCancelLinkFacts> = {}): AppointmentCancelLinkFacts => ({
	status: 'booked',
	startTime: '2026-11-16T09:00:00.000Z',
	endTime: '2026-11-16T09:30:00.000Z',
	officeTimeZone: 'Europe/Athens',
	doctor: { name: 'Μαρία Τριανταφύλλου', specialty: 'Δερματολόγος' },
	office: {
		street: 'Ερμού',
		streetNumber: '101',
		city: 'Αθήνα',
		postalCode: '10563',
		floor: 2,
		phone: '2103210101'
	},
	cancellation: { cutoffHours: 8, deadline: '2026-11-16T01:00:00.000Z' },
	canCancel: true,
	late: false,
	...patch
});
const NBSP = ' ';

describe('🔴 D-W51-72 · the link’s secret, checked before any request', () => {
	it('16 base64url characters, the server’s shape — anything else is none', () => {
		expect(readAppointmentCancelToken('AbCdEfGh_-123456')).toBe('AbCdEfGh_-123456');
		for (const value of [
			'AbCdEfGh_-12345',
			'AbCdEfGh_-1234567',
			'AbCdEfGh_-12345=',
			'AbCdEfGh/-123456',
			'<script>12345678',
			'',
			null,
			undefined,
			12
		]) {
			expect(readAppointmentCancelToken(value), String(value)).toBeNull();
		}
	});
});

describe('the page of one link (D-W51-72)', () => {
	it('the form while it may be cancelled online; «καλέστε το ιατρείο» once the deadline passed; «δεν ισχύει» for anything else', () => {
		expect(appointmentCancelLinkView(link())).toBe('form');
		expect(appointmentCancelLinkView(link({ canCancel: false, late: true }))).toBe('late');
		expect(appointmentCancelLinkView(link({ canCancel: false, late: false }))).toBe('gone');
	});

	it('🔴 the box: the doctor (name with the title, specialty), the day and the hour on the office’s clock, the office — and nothing of the patient', () => {
		expect(buildCancelLinkContext(link(), 'el')).toEqual({
			label: 'Το ραντεβού σας',
			when: 'Δευτέρα 16 Νοεμβρίου · 11:00',
			line: 'Dr. Μαρία Τριανταφύλλου · Δερματολόγος',
			address: 'Ερμού 101, Αθήνα 10563',
			forWhom: null,
			photo: null
		});
		expect(buildCancelLinkContext(link({ status: 'pending' }), 'el').label).toBe('Το αίτημά σας');
		expect(
			buildCancelLinkContext(link({ doctor: { name: null, specialty: null } }), 'el').line
		).toBe('');
	});

	it('«Προθεσμία ακύρωσης» as the 53 says it — until the deadline, then by phone with the office’s number; until the hour for a request', () => {
		expect(buildCancelLinkTerms(link(), 'el')).toEqual({
			title: 'Προθεσμία ακύρωσης',
			lines: [
				{ title: 'Έως Δευτέρα 16 Νοεμβρίου, 03:00', body: 'Ακυρώνετε από εδώ.' },
				{
					title: 'Μετά',
					body: `Μόνο τηλεφωνικά με το ιατρείο · 210${NBSP}321${NBSP}0101`
				}
			]
		});
		expect(buildCancelLinkTerms(link({ status: 'pending' }), 'el').lines[0]?.title).toBe(
			'Έως την ώρα του ραντεβού'
		);
	});

	it('«Τι θα γίνει» — the 53’s words without the email’s (the page knows nothing of the patient)', () => {
		expect(cancelLinkThenLines('el')).toEqual([
			'Ο γιατρός ενημερώνεται αμέσως και βλέπει τον λόγο.',
			'Η ώρα ελευθερώνεται για άλλους ασθενείς.',
			'Η ακύρωση δεν αναιρείται. Για νέο ραντεβού, κλείνετε ξανά από το προφίλ του γιατρού.'
		]);
	});

	it('🔴 U-198.1 / U-65.6: only a reason of the patient’s five travels; too many has its own words', () => {
		expect(toCancelLinkRequest({ reasonCode: 'PERSONAL', reasonText: 'x' })).toEqual({
			reasonCode: 'PERSONAL',
			reasonText: 'x'
		});
		expect(toCancelLinkRequest({ reasonCode: 'OTHER' })).toEqual({ reasonCode: 'OTHER' });
		for (const code of ['DOCTOR_UNAVAILABLE', 'EMERGENCY', 'other', '<b>x</b>']) {
			expect(toCancelLinkRequest({ reasonCode: code }), code).toBeNull();
		}
		expect(toCancelLinkRequest(null)).toBeNull();
		expect(cancelLinkFailureText('rate-limited', 'el')).toBe(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(cancelLinkFailureText('unknown', 'el')).toBe(
			'Η ακύρωση δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
	});
});

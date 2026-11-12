import { describe, expect, it } from 'vitest';
import type { AppointmentFacts } from '$modules/appointments/api/appointment';
import { appointmentFactsSample } from '$modules/appointments/api/appointment/appointment.sample';
import {
	appointmentCalendarLocation,
	buildAppointmentCalendarFile,
	serializeAppointmentIcs,
	type AppointmentIcsInput
} from '.';

const input: AppointmentIcsInput = {
	appointmentId: '0193a1b2-0000-7000-8000-0000000000a1',
	startTime: '2026-11-12T10:30:00.000Z',
	endTime: '2026-11-12T11:00:00.000Z',
	summary: 'Ραντεβού: Μαρία Τριανταφύλλου',
	location: 'Ερμού 101, Αθήνα, 10555',
	description: 'Το ραντεβού σας μέσω eDoctor.',
	sequence: 0,
	dtstamp: '2026-11-01T09:00:00.000Z'
};

const lines = (text: string) => text.split('\r\n');
/** The value of a property, its folds joined back (RFC 5545 §3.1 unfolding). */
const unfold = (text: string) => text.replace(/\r\n /gu, '');
const octets = (line: string) => new TextEncoder().encode(line).length;

const office = () => {
	if (!appointmentFactsSample.office) throw new Error('the sample has an office');
	return appointmentFactsSample.office;
};

const appointment = (extra: Partial<AppointmentFacts> = {}): AppointmentFacts => ({
	...appointmentFactsSample,
	...extra
});

describe('lib/calendar · the web’s `.ics` (D-W4-31)', () => {
	it('D-W4-31 · m-4: PUBLISH, the appointment’s id as the UID, SEQUENCE:0, DTSTAMP = updatedAt, UTC hours, no ORGANIZER or ATTENDEE, CRLF', () => {
		const text = serializeAppointmentIcs(input) as string;
		expect(text.endsWith('\r\n')).toBe(true);
		expect(text.replace(/\r\n/gu, '')).not.toMatch(/\n|\r/u);
		expect(lines(text)).toEqual([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//eDoctor//Appointments//EN',
			'CALSCALE:GREGORIAN',
			'METHOD:PUBLISH',
			'BEGIN:VEVENT',
			'UID:0193a1b2-0000-7000-8000-0000000000a1',
			'SEQUENCE:0',
			'DTSTAMP:20261101T090000Z',
			'DTSTART:20261112T103000Z',
			'DTEND:20261112T110000Z',
			'SUMMARY:Ραντεβού: Μαρία Τριανταφύλλου',
			'LOCATION:Ερμού 101\\, Αθήνα\\, 10555',
			'DESCRIPTION:Το ραντεβού σας μέσω eDoctor.',
			'STATUS:CONFIRMED',
			'END:VEVENT',
			'END:VCALENDAR',
			''
		]);
		expect(text).not.toMatch(/ORGANIZER|ATTENDEE|METHOD:CANCEL/u);
	});

	it('🔴 RFC 5545 §3.3.11 (negative): an address with `;` `,` `\\` and line breaks cannot open a block of its own — every break is `\\n`', () => {
		const text = serializeAppointmentIcs({
			...input,
			location: 'Οδός 1; 2, \\ γωνία\r\nEND:VEVENT\nBEGIN:VEVENT\rX'
		}) as string;
		const location = lines(unfold(text)).find((line) => line.startsWith('LOCATION:'));
		expect(location).toBe('LOCATION:Οδός 1\\; 2\\, \\\\ γωνία\\nEND:VEVENT\\nBEGIN:VEVENT\\nX');
		expect(lines(unfold(text)).filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1);
		expect(lines(unfold(text)).filter((line) => line === 'END:VEVENT')).toHaveLength(1);
	});

	it('RFC 5545 §3.1: 80+ Greek characters fold at 75 octets, a continuation starts with one space, no character is cut', () => {
		const summary = `Ραντεβού: ${'Παπαδημητρακοπούλου '.repeat(5).trim()}`;
		const text = serializeAppointmentIcs({ ...input, summary }) as string;
		for (const line of lines(text)) expect(octets(line), line).toBeLessThanOrEqual(75);
		expect(text).toContain('\r\n ');
		expect(text).not.toContain('�');
		const folded = lines(unfold(text)).find((line) => line.startsWith('SUMMARY:'));
		expect(folded).toBe(`SUMMARY:${summary}`);
	});

	it('(negative) what the email’s builder refuses gives no file: no id, no summary, a broken instant, an end not after the start, a bad sequence', () => {
		expect(serializeAppointmentIcs({ ...input, appointmentId: ' ' })).toBeNull();
		expect(serializeAppointmentIcs({ ...input, summary: '' })).toBeNull();
		expect(serializeAppointmentIcs({ ...input, startTime: 'αύριο' })).toBeNull();
		expect(serializeAppointmentIcs({ ...input, dtstamp: '' })).toBeNull();
		expect(serializeAppointmentIcs({ ...input, endTime: input.startTime })).toBeNull();
		expect(serializeAppointmentIcs({ ...input, sequence: -1 })).toBeNull();
		expect(serializeAppointmentIcs({ ...input, sequence: 0.5 })).toBeNull();
	});

	it('the email’s place: «street number, city, postal code» in the page’s language, else the Greek, else the first; «—» without one', () => {
		const office = appointmentFactsSample.office;
		if (!office) throw new Error('the sample has an office');
		const greek = { ...office.translations[0], language: 'el', street: 'Ερμού', city: 'Αθήνα' };
		const both = { ...office, translations: [greek, ...office.translations] };
		expect(appointmentCalendarLocation(both, 'el')).toBe('Ερμού 101, Αθήνα, 10555');
		expect(appointmentCalendarLocation(both, 'en')).toBe('Ermou 101, Athens, 10555');
		// The email's own fallbacks: no copy in the page's language ⇒ the Greek one, else the first there is.
		const french = { ...office.translations[0], language: 'fr', street: 'Rue', city: 'Paris' };
		expect(appointmentCalendarLocation({ ...office, translations: [french, greek] }, 'en')).toBe(
			'Ερμού 101, Αθήνα, 10555'
		);
		expect(appointmentCalendarLocation({ ...office, translations: [french] }, 'el')).toBe(
			'Rue 101, Paris, 10555'
		);
		expect(
			appointmentCalendarLocation(
				{ ...office, translations: [], streetNumber: null, postalCode: '  ' },
				'el'
			)
		).toBe('Ερμού, Αθήνα');
		// D-W4-31 (the orchestrator, 11/11): no office, or one with no part left — the email's «—», never an empty place.
		expect(appointmentCalendarLocation(null, 'el')).toBe('—');
		expect(
			appointmentCalendarLocation(
				{
					...office,
					translations: [],
					street: ' ',
					streetNumber: null,
					city: '',
					postalCode: null
				},
				'en'
			)
		).toBe('—');
	});

	it('D-W4-31: a kept visit gives the email’s title, place and sentence, named by its office’s day; el and en', () => {
		const file = buildAppointmentCalendarFile({
			appointment: appointment({ office: { ...office(), translations: [] } }),
			doctorName: ' Μαρία Τριανταφύλλου ',
			locale: 'el'
		});
		expect(file?.fileName).toBe('edoctor-appointment-2026-11-12.ics');
		const text = unfold(file?.text ?? '');
		expect(text).toContain('SUMMARY:Ραντεβού: Μαρία Τριανταφύλλου\r\n');
		expect(text).toContain('LOCATION:Ερμού 101\\, Αθήνα\\, 10555\r\n');
		expect(text).toContain('DESCRIPTION:Το ραντεβού σας μέσω eDoctor.\r\n');
		expect(text).toContain(`UID:${appointmentFactsSample.id}\r\n`);
		expect(text).toContain('DTSTAMP:20261101T090000Z\r\n');
		const english = unfold(
			buildAppointmentCalendarFile({
				appointment: appointment(),
				doctorName: 'Maria Triantafyllou',
				locale: 'en'
			})?.text ?? ''
		);
		expect(english).toContain('SUMMARY:Appointment with Maria Triantafyllou\r\n');
		expect(english).toContain('DESCRIPTION:Your appointment through eDoctor.\r\n');
		// The office's day, not the UTC one: 00:30 in Athens is the 13th, while UTC still says the 12th.
		expect(
			buildAppointmentCalendarFile({
				appointment: appointment({
					startTime: '2026-11-12T22:30:00.000Z',
					endTime: '2026-11-12T23:00:00.000Z'
				}),
				doctorName: 'Μαρία',
				locale: 'el'
			})?.fileName
		).toBe('edoctor-appointment-2026-11-13.ics');
	});

	it('🔴 U-65.6 / P-A4 Σ9 (negative): never the patient’s note, a relative’s name or the holder’s — and the file’s name holds no person', () => {
		const file = buildAppointmentCalendarFile({
			appointment: appointment({
				patientNote: 'ΣΗΜΕΙΩΣΗ-ΚΑΝΑΡΙΝΙ πονάει',
				snapshot: {
					...appointmentFactsSample.snapshot,
					visitor: { kind: 'relative', name: 'Γιώργος ΚΑΝΑΡΙΝΙ' }
				},
				relative: {
					relativeId: 'r1',
					firstName: 'Γιώργος',
					lastName: 'ΚΑΝΑΡΙΝΙ',
					relationship: 'CHILD',
					gender: 'MALE'
				}
			}),
			doctorName: 'Μαρία Τριανταφύλλου',
			locale: 'el'
		});
		expect(file).not.toBeNull();
		expect(unfold(file?.text ?? '')).not.toMatch(/ΚΑΝΑΡΙΝΙ|πονάει|Γιώργος|Ελένη|Παππά/u);
		expect(file?.fileName).toMatch(/^edoctor-appointment-\d{4}-\d\d-\d\d\.ics$/u);
	});

	it('D-W4-31 (negative): only a kept appointment, and only once it can be written whole', () => {
		for (const status of [
			'pending',
			'canceled',
			'completed',
			'rejected',
			'expired',
			'no_show',
			'checked_in',
			'unavailable'
		] as const) {
			expect(
				buildAppointmentCalendarFile({
					appointment: appointment({ status }),
					doctorName: 'Μαρία',
					locale: 'el'
				}),
				status
			).toBeNull();
		}
		expect(
			buildAppointmentCalendarFile({ appointment: appointment(), doctorName: null, locale: 'el' })
		).toBeNull();
		expect(
			buildAppointmentCalendarFile({ appointment: appointment(), doctorName: '  ', locale: 'el' })
		).toBeNull();
		expect(
			buildAppointmentCalendarFile({
				appointment: appointment({ endTime: null }),
				doctorName: 'Μαρία',
				locale: 'el'
			})
		).toBeNull();
		expect(
			buildAppointmentCalendarFile({
				appointment: appointment({ updatedAt: null }),
				doctorName: 'Μαρία',
				locale: 'el'
			})
		).toBeNull();
	});
});

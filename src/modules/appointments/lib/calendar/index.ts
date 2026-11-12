import { m } from '$paraglide/messages.js';
import { zonedDay } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	AppointmentFacts,
	AppointmentOfficeFacts
} from '$modules/appointments/api/appointment';

/*
 * 🔴 D-W4-31 (P-W4 Σ-19 = Β, P-B4 Σ-7 with the senior-engineer's m-4): «Προσθήκη στο ημερολόγιο» of the web is a `.ics`
 * the BROWSER writes from the appointment it already holds — the same file the confirmation email attaches
 * (`backend/src/modules/notification/domain/helpers/ics/index.ts`, its golden vectors guard this copy): RFC 5545, UTC
 * from the server's own instants (no zone arithmetic here), the four escapes, lines folded at 75 octets without cutting a
 * character. The web's terms: `METHOD:PUBLISH`, `UID` the appointment's id (the email's, so a calendar that has the
 * email's event finds it), `SEQUENCE:0` (never more: a later email's move must still win), `DTSTAMP` the appointment's
 * `updatedAt`, no `ORGANIZER`. 🔴 U-65.6 / P-A4 Σ9: a calendar syncs to a third party's cloud, so the file never carries
 * the patient's note or a relative's name — only the doctor, the hours and the office.
 */

/** One calendar file as the email's builder takes it (its `PUBLISH` half): the instants are ISO strings. */
export type AppointmentIcsInput = {
	appointmentId: string;
	startTime: string;
	endTime: string;
	summary: string;
	location: string;
	description: string;
	sequence: number;
	dtstamp: string;
};

const PRODUCT_ID = '-//eDoctor//Appointments//EN';
const MAX_LINE_OCTETS = 75;
const CRLF = '\r\n';

/** RFC 5545 §3.3.5: `YYYYMMDDTHHMMSSZ`, no separators, no fraction; `null` for what is not an instant. */
function formatUtc(instant: string): string | null {
	const time = Date.parse(instant);
	if (Number.isNaN(time)) return null;
	return new Date(time)
		.toISOString()
		.replace(/[-:]/gu, '')
		.replace(/\.\d{3}/u, '');
}

/** RFC 5545 §3.3.11: only these four sequences are escaped inside a TEXT value (no line of an address starts a block). */
function escapeText(value: string): string {
	return value
		.replace(/\\/gu, '\\\\')
		.replace(/;/gu, '\\;')
		.replace(/,/gu, '\\,')
		.replace(/\r\n|\r|\n/gu, '\\n');
}

/** RFC 5545 §3.1: at most 75 OCTETS a line, a continuation starts with one space; a character is never split. */
function foldLine(line: string): string {
	const encoder = new TextEncoder();
	const parts: string[] = [];
	let current = '';
	let octets = 0;
	for (const character of line) {
		const size = encoder.encode(character).length;
		if (octets + size > MAX_LINE_OCTETS) {
			parts.push(current);
			current = '';
			octets = 1;
		}
		current += character;
		octets += size;
	}
	parts.push(current);
	return parts.join(`${CRLF} `);
}

/**
 * The calendar's text, byte for byte the email's for the same input (its golden vectors `publish` / `reschedule`); `null`
 * for an input the email's builder refuses (no id or summary, a broken instant, an end not after the start, a sequence
 * that is not a whole number from 0).
 */
export function serializeAppointmentIcs(input: AppointmentIcsInput): string | null {
	const start = formatUtc(input.startTime);
	const end = formatUtc(input.endTime);
	const stamp = formatUtc(input.dtstamp);
	if (!input.appointmentId.trim() || !input.summary.trim() || !start || !end || !stamp) {
		return null;
	}
	if (!Number.isInteger(input.sequence) || input.sequence < 0) return null;
	if (Date.parse(input.endTime) <= Date.parse(input.startTime)) return null;
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		`PRODID:${PRODUCT_ID}`,
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${escapeText(input.appointmentId)}`,
		`SEQUENCE:${input.sequence}`,
		`DTSTAMP:${stamp}`,
		`DTSTART:${start}`,
		`DTEND:${end}`,
		`SUMMARY:${escapeText(input.summary)}`,
		`LOCATION:${escapeText(input.location)}`,
		`DESCRIPTION:${escapeText(input.description)}`,
		'STATUS:CONFIRMED',
		'END:VEVENT',
		'END:VCALENDAR'
	];
	return `${lines.map(foldLine).join(CRLF)}${CRLF}`;
}

/**
 * What the email writes for a place it does not have (backend `NOTIFICATION_ABSENT_VALUE`, read by the
 * `calendar-golden` guard): the same «—» in the browser's file, so ONE event has one place, whichever side wrote it.
 */
export const APPOINTMENT_CALENDAR_ABSENT_VALUE = '—';

/**
 * The event's place, the email's words (backend `appointment-payload` `formatOfficeAddress`, P-B4-review 5 (γ): its
 * third copy, kept to the same rule): «street number, city, postal code» of the frozen office, in the page's language,
 * else the Greek, else the first it has; «—» with none, as the email (D-W4-31: byte for byte).
 */
export function appointmentCalendarLocation(
	office: AppointmentOfficeFacts | null,
	locale: SupportedLocale
): string {
	if (!office) {
		return APPOINTMENT_CALENDAR_ABSENT_VALUE;
	}
	const translation =
		office.translations.find((entry) => entry.language === locale) ??
		office.translations.find((entry) => entry.language === 'el') ??
		office.translations[0] ??
		null;
	const street = translation?.street ?? office.street;
	const streetNumber = translation?.streetNumber ?? office.streetNumber;
	const city = translation?.city ?? office.city;
	const parts = [[street, streetNumber].filter(Boolean).join(' '), city, office.postalCode]
		.map((part) => (typeof part === 'string' ? part.trim() : ''))
		.filter((part) => part.length > 0);
	return parts.length > 0 ? parts.join(', ') : APPOINTMENT_CALENDAR_ABSENT_VALUE;
}

/** The file the browser hands over: its name (a date, never a person) and its text. */
export type AppointmentCalendarFile = { fileName: string; text: string };

/**
 * 🔴 D-W4-31: the `.ics` of a KEPT appointment (`booked`; the row is for the upcoming ones, `lib/detail`), titled with the
 * doctor as the email names them (`{{name}}`: the bare name, the neutral Greek «Ραντεβού: …» since the page does not
 * know the doctor's gender), placed at the frozen office, described with the email's sentence. `null` when it cannot
 * be written whole — another status, no doctor's name yet, no end, no `updatedAt` — so the row is not offered.
 */
export function buildAppointmentCalendarFile({
	appointment,
	doctorName,
	locale
}: {
	appointment: AppointmentFacts;
	doctorName: string | null | undefined;
	locale: SupportedLocale;
}): AppointmentCalendarFile | null {
	const doctor = doctorName?.trim();
	if (appointment.status !== 'booked' || !doctor) return null;
	if (!appointment.endTime || !appointment.updatedAt) return null;
	const text = serializeAppointmentIcs({
		appointmentId: appointment.id,
		startTime: appointment.startTime,
		endTime: appointment.endTime,
		summary: m.appointments_calendar_title({ doctor }, { locale }),
		location: appointmentCalendarLocation(appointment.office, locale),
		description: m.appointments_calendar_description({}, { locale }),
		sequence: 0,
		dtstamp: appointment.updatedAt
	});
	if (!text) return null;
	const day = zonedDay(Date.parse(appointment.startTime), appointment.officeTimeZone);
	return { fileName: `edoctor-appointment-${day}.ics`, text };
}

/** The type the browser is told the file is (`saveFile`): a calendar, in UTF-8. */
export const APPOINTMENT_CALENDAR_TYPE = 'text/calendar;charset=utf-8';

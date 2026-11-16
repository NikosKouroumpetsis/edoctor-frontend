import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { appointmentNearDayLabel, appointmentNearWhenLabel } from '$shared/lib/appointment-when';
import { relativeNameWithWord } from '$shared/lib/relative-words';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { ConversationAppointmentLine } from '$modules/messages/types';

/** «Νίκος Μαυρίδης (παιδί)»: the relative a request is for, with the word of the relationship when this build has one. */
function relativeName(
	forRelative: NonNullable<ConversationAppointmentLine['forRelative']>,
	locale: SupportedLocale
): string {
	const name = [forRelative.firstName, forRelative.lastName].filter(Boolean).join(' ').trim();
	return relativeNameWithWord(name, forRelative.relation ?? '', null, locale);
}

/**
 * 🔴 D-W51-86 (88 §74; the application's `lib/appointment-line`): the line under a patient's name in the doctor's messages
 * — «Ραντεβού: {πότε}», «Αίτημα: {πότε}», «Αίτημα για τον/την {όνομα} ({σχέση}) · {πότε}», «Τελευταία επίσκεψη: {πότε}» —
 * the «πότε» of the lines of 66 / 67 / 73, on the platform's calendar. No line is `null`: never «Ασθενής» in its place.
 */
export function buildAppointmentLine(
	line: ConversationAppointmentLine | null,
	now: number,
	locale: SupportedLocale
): string | null {
	if (!line || Number.isNaN(Date.parse(line.startTime))) return null;
	const options = { locale };
	if (line.kind === 'lastVisit') {
		const day = appointmentNearDayLabel(line.startTime, now, locale, PLATFORM_TIME_ZONE);
		return day ? m.messages_doctor_line_last_visit({ when: day }, options) : null;
	}
	const when = appointmentNearWhenLabel(line.startTime, now, locale, PLATFORM_TIME_ZONE);
	if (line.kind === 'upcoming') return m.messages_doctor_line_upcoming({ when }, options);
	const name = line.forRelative ? relativeName(line.forRelative, locale) : '';
	return name
		? m.messages_doctor_line_request_for({ name, when }, options)
		: m.messages_doctor_line_request({ when }, options);
}

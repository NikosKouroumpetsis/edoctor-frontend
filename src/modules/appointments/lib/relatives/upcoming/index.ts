import { m } from '$paraglide/messages.js';
import { withDoctorTitle } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AppointmentFacts } from '$modules/appointments/api/appointment';
import { appointmentDayTimeLabel } from '$modules/appointments/lib/when';

/** A relative's upcoming visits as the deletion's window says them: how many, and the first. */
export type RelativeUpcomingFacts = { count: number; first: AppointmentFacts | null };

/**
 * 🔴 D-W4-21 (P-B4 §4): the relative's upcoming visits out of the ONE read of the person's upcoming (`limit=100`): those
 * booked for this relative (its id on the appointment, kept after a deletion, U-139.4), in the order the server gave
 * (oldest first). The deletion is allowed whatever this says.
 */
export function relativeUpcoming(
	appointments: readonly AppointmentFacts[],
	relativeId: string
): RelativeUpcomingFacts {
	const theirs = appointments.filter((appointment) => appointment.relativeId === relativeId);
	return { count: theirs.length, first: theirs[0] ?? null };
}

/**
 * U-139.4 · «Έχει 1 επερχόμενο ραντεβού, που θα γίνει κανονικά: Τρίτη 24 Νοεμβρίου · 17:30 · Dr. Αθηνά Παπαδοπούλου.»,
 * «Έχει {count} επερχόμενα ραντεβού, … Το πρώτο: …» for more (D-W4-13); `null` for none. The doctor's name only once
 * its profile answered (the screen's read, D-W4-29), never an id.
 */
export function relativeUpcomingLine(
	upcoming: RelativeUpcomingFacts,
	doctorName: string | null | undefined,
	locale: SupportedLocale
): string | null {
	const { count, first } = upcoming;
	if (count === 0 || !first) return null;
	const doctor = doctorName?.trim() ? withDoctorTitle(doctorName.trim()) : '';
	const when = [appointmentDayTimeLabel(first.startTime, locale, first.officeTimeZone), doctor]
		.filter(Boolean)
		.join(' · ');
	return count === 1
		? m.relatives_delete_confirm_upcoming({ when }, { locale })
		: m.relatives_delete_confirm_upcoming_many({ count, when }, { locale });
}

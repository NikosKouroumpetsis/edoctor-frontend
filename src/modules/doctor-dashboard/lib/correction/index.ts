import { m } from '$paraglide/messages.js';
import { appointmentDeadlineLabel } from '$shared/lib/appointment-when';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorAppointmentDetailFacts } from '$modules/doctor-dashboard/api/appointments';
import {
	doctorSettledVerdict,
	doctorVerdictWord,
	type DoctorAppointmentOutcomeAnswer
} from '$modules/doctor-dashboard/lib/detail';
import {
	buildDoctorAppointmentContext,
	type DoctorReasonContext
} from '$modules/doctor-dashboard/lib/reason';

/*
 * Wave 5.1 · screen 71 «Διόρθωση έκβασης» in words (D-W51-62; 88 §71; `64-switch/sw.js:557-577` `fixPage`): the box of
 * the visit, «Τώρα» — the verdict, who wrote it, until when it may be corrected —, «Τι έγινε τελικά;» in two rows (the
 * current one «όπως είναι τώρα»), what will happen, «Άκυρο / Αποθήκευση». Everything the server's: the verdict it holds,
 * the opposite it opens (`actions.correction`), the instant it closes (`outcomeCorrectableUntil`), never computed.
 */

/**
 * 🔴 D-W51-62 · U-196.1 (the server's `actions`, never a guess): the form while the server opens the correction of a
 * settled visit into its opposite — the system's verdict or the doctor's own —, else «δεν γίνεται πια».
 */
export function doctorCorrectionEntry(
	appointment: Pick<DoctorAppointmentDetailFacts, 'status' | 'actions' | 'outcomeSource'>
): 'form' | 'closed' {
	const verdict = doctorSettledVerdict(appointment.status);
	const correction = appointment.actions.correction;
	return verdict && correction && correction.to !== verdict && appointment.outcomeSource
		? 'form'
		: 'closed';
}

/** The box of the visit (`sw.js:570` `ctxOf(a, 'Η επίσκεψη')`): the box of screens 69 and 70 with its own word. */
export function buildDoctorCorrectionContext(
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
): DoctorReasonContext {
	return buildDoctorAppointmentContext(
		appointment,
		m.doctor_correction_context({}, { locale }),
		locale
	);
}

/** One row of «Τώρα»: its strong words and the muted ones under them. */
export type DoctorCorrectionNowLine = { title: string; body: string };

/**
 * «Τώρα» (`sw.js:571`, the 53's `.a-terms`): ««Ολοκληρώθηκε»» with «Γράφτηκε αυτόματα, γιατί δεν δηλώσατε έκβαση σε
 * 24 ώρες.» or «Το γράψατε εσείς · {πότε}» (U-196.1); «Διορθώνεται ως {πότε}» with «48 ώρες μετά το τέλος της
 * επίσκεψης.». The instants are the server's (`outcomeAt`, `outcomeCorrectableUntil`); a row without its instant says
 * no time.
 */
export function buildDoctorCorrectionNow(
	appointment: DoctorAppointmentDetailFacts,
	locale: SupportedLocale
): { title: string; lines: DoctorCorrectionNowLine[] } {
	const options = { locale };
	const verdict = doctorSettledVerdict(appointment.status);
	const zone = appointment.officeTimeZone;
	const lines: DoctorCorrectionNowLine[] = [];
	if (verdict) {
		const wrote = appointment.outcomeAt
			? appointmentDeadlineLabel(appointment.outcomeAt, locale, zone)
			: '';
		lines.push({
			title: m.doctor_correction_quoted({ outcome: doctorVerdictWord(verdict, locale) }, options),
			body:
				appointment.outcomeSource === 'SYSTEM'
					? m.doctor_correction_by_system({}, options)
					: wrote
						? m.doctor_correction_by_you({ when: wrote }, options)
						: m.doctor_correction_by_you_plain({}, options)
		});
	}
	const until =
		appointment.outcomeCorrectableUntil ?? appointment.actions.correction?.until ?? null;
	const when = until ? appointmentDeadlineLabel(until, locale, zone) : '';
	if (when) {
		lines.push({
			title: m.doctor_correction_until({ when }, options),
			body: m.doctor_correction_window({}, options)
		});
	}
	return { title: m.doctor_correction_now({}, options), lines };
}

/**
 * «Τι έγινε τελικά;» (`sw.js:567`): two rows — the verdict it holds now, «όπως είναι τώρα», and the opposite the server
 * opens; none for a visit that holds no verdict.
 */
export function doctorCorrectionOptions(
	appointment: Pick<DoctorAppointmentDetailFacts, 'status' | 'actions'>,
	locale: SupportedLocale
): { value: DoctorAppointmentOutcomeAnswer; label: string; note?: string }[] {
	const current = doctorSettledVerdict(appointment.status);
	const opposite = appointment.actions.correction?.to ?? null;
	if (!current || !opposite || opposite === current) return [];
	return [
		{
			value: current,
			label: doctorVerdictWord(current, locale),
			note: m.doctor_correction_as_now({}, { locale })
		},
		{ value: opposite, label: doctorVerdictWord(opposite, locale) }
	];
}

/**
 * «Τι θα γίνει» (88 §71, `sw.js:564-566`) of the verdict chosen against the one it holds: towards «Δεν ήρθε» three
 * lines (the patient told, the invitation to review withdrawn, refused with a review written), towards «Ολοκληρώθηκε»
 * two; none while nothing would change.
 */
export function doctorCorrectionThenLines(
	current: DoctorAppointmentOutcomeAnswer | null,
	chosen: DoctorAppointmentOutcomeAnswer | null,
	locale: SupportedLocale
): string[] {
	if (!chosen || chosen === current) return [];
	const options = { locale };
	return chosen === 'NO_SHOW'
		? [
				m.doctor_correction_then_no_show_told({}, options),
				m.doctor_correction_then_no_show_invitation({}, options),
				m.doctor_correction_then_no_show_rated({}, options)
			]
		: [
				m.doctor_correction_then_completed_told({}, options),
				m.doctor_correction_then_completed_review({}, options)
			];
}

/**
 * 🔴 U-65.6: what one press may send — only the opposite the server opens on this visit, never the verdict it holds or
 * a value of the page's own; `null` for anything else (the button sleeps).
 */
export function doctorCorrectionTarget(
	appointment: Pick<DoctorAppointmentDetailFacts, 'status' | 'actions' | 'outcomeSource'>,
	chosen: unknown
): DoctorAppointmentOutcomeAnswer | null {
	if (doctorCorrectionEntry(appointment) !== 'form') return null;
	const to = appointment.actions.correction?.to ?? null;
	return to !== null && chosen === to ? to : null;
}

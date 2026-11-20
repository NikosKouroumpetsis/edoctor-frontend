import { m } from '$paraglide/messages.js';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import type { DoctorPracticeLicenceFacts } from '$modules/doctor-dashboard/api/profile';
import type {
	DoctorSpecializationFacts,
	DoctorSpecializationOptionFacts,
	DoctorSpecializationsFailure
} from '$modules/doctor-dashboard/api/specializations';
import { DOCTOR_SPECIALIZATION_LIMIT } from '$modules/doctor-dashboard/config';

type Locale = 'el' | 'en';

const SEPARATOR = ' · ';

/**
 * 🔴 D-W52-59 (`80-spec.html`): «Αριθμός 48213 · από 12 Μαρτίου 2010» — each part only with its fact (the number is
 * optional at the sign-up; the day is written as the reader's own calendar says it); the day alone starts the line,
 * «Από 12 Μαρτίου 2010» (the application's same words). Neither ⇒ `null`.
 */
export function doctorPracticeLicenceLine(
	licence: DoctorPracticeLicenceFacts,
	locale: Locale
): string | null {
	const options = { locale };
	const date = licence.obtainedDay
		? formatCalendarDay(licence.obtainedDay, locale, {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})
		: null;
	if (!licence.number) {
		return date ? m.doctor_my_specialty_licence_since_only({ date }, options) : null;
	}
	const number = m.doctor_my_specialty_licence_number({ number: licence.number }, options);
	return date
		? `${number}${SEPARATOR}${m.doctor_my_specialty_licence_since({ date }, options)}`
		: number;
}

/** One pick as screen 80 writes it: its name and, for a title the team has not approved, where it stands. */
export type DoctorSpecializationLine = {
	code: string;
	name: string;
	/** 🔴 U-225: «Ελέγχεται» while the team checks the title, «Δεν εγκρίθηκε» once it said no; none for a shown one. */
	note: string | null;
	/** A rejected pick is the doctor's to take out: its note is written in the strong colour. */
	rejected: boolean;
};

/** 🔴 D-W52-59 · U-225: the doctor's picks in the server's order, each with the word of its status. */
export function buildDoctorSpecializationLines(
	picks: readonly DoctorSpecializationFacts[],
	locale: Locale
): DoctorSpecializationLine[] {
	const options = { locale };
	return picks.map(({ code, name, status }) => ({
		code,
		name,
		note:
			status === 'PENDING'
				? m.doctor_my_specializations_pending({}, options)
				: status === 'REJECTED'
					? m.doctor_my_specializations_rejected({}, options)
					: null,
		rejected: status === 'REJECTED'
	}));
}

/** «2 από 3»: every pick counts, whatever its status (the server's own count). */
export function doctorSpecializationsCountText(count: number, locale: Locale): string {
	return m.doctor_my_specializations_count(
		{ count, limit: DOCTOR_SPECIALIZATION_LIMIT },
		{ locale }
	);
}

/** One row of the choice: the catalogue's line, the words under a title of the Gazette, and whether it can be pressed. */
export type DoctorSpecializationRow = {
	value: string;
	label: string;
	detail?: string;
	disabled: boolean;
};

/**
 * 🔴 D-W52-59 · U-112 · U-225 (`64-switch/sw.js` `spPickPage`): the list of the specialty as rows with ticks, in the
 * server's order. At the limit every row that is not chosen goes out (it can be chosen again once one is taken out); a
 * title of the Government Gazette says under its name that the team checks it.
 */
export function buildDoctorSpecializationRows(
	list: readonly DoctorSpecializationOptionFacts[],
	chosen: readonly string[],
	locale: Locale
): DoctorSpecializationRow[] {
	const full = chosen.length >= DOCTOR_SPECIALIZATION_LIMIT;
	return list.map(({ code, name, kind }) => ({
		value: code,
		label: name,
		...(kind === 'FEK_TITLE'
			? { detail: m.doctor_my_specializations_title_note({}, { locale }) }
			: {}),
		disabled: full && !chosen.includes(code)
	}));
}

/**
 * 🔴 D-W52-59: a press on a row — a chosen one goes out; another comes in only below the limit (at it the press changes
 * nothing: the row is out, and the server refuses a fourth too). The set keeps the order of the presses; the server
 * answers in the catalogue's.
 */
export function toggleDoctorSpecialization(chosen: readonly string[], code: string): string[] {
	if (chosen.includes(code)) return chosen.filter((entry) => entry !== code);
	return chosen.length < DOCTOR_SPECIALIZATION_LIMIT ? [...chosen, code] : [...chosen];
}

/** Whether two choices hold the same codes, in any order («Αποθήκευση» waits for a change). */
export function sameDoctorSpecializations(
	one: readonly string[],
	other: readonly string[]
): boolean {
	return one.length === other.length && one.every((code) => other.includes(code));
}

/**
 * 🔴 U-140: the words under the list (`spPickPage`) — «Διαλέξατε 3. Για να διαλέξετε άλλη, βγάλτε μία.» at the limit,
 * else «N από 3».
 */
export function doctorSpecializationsHint(count: number, locale: Locale): string {
	return count >= DOCTOR_SPECIALIZATION_LIMIT
		? m.doctor_my_specializations_full({ limit: DOCTOR_SPECIALIZATION_LIMIT }, { locale })
		: doctorSpecializationsCountText(count, locale);
}

/**
 * 🔴 D-W52-59: the page's words for a save the server refused — past three, it says the limit's own sentence; a list
 * that is no longer the specialty's says so (the page reads it again); too many writes; anything else — a write that
 * met another, one that was not allowed, the connection — that the change was not saved (the application's same three
 * sentences). `session` has no words: the session's own page takes over.
 */
export function doctorSpecializationsFailureText(
	failure: Exclude<DoctorSpecializationsFailure, 'session'>,
	locale: Locale
): string {
	const options = { locale };
	switch (failure) {
		case 'invalid':
			return m.doctor_my_specializations_full({ limit: DOCTOR_SPECIALIZATION_LIMIT }, options);
		case 'not-of-specialty':
			return m.doctor_my_specializations_error_changed({}, options);
		case 'rate-limited':
			return m.doctor_reason_rate_limited({}, options);
		case 'conflict':
		case 'forbidden':
		case 'unknown':
			return m.doctor_my_specializations_error_failed({}, options);
	}
}

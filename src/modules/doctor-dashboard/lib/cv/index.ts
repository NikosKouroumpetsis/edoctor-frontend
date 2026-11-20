import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { zonedDay } from '$shared/lib/format';
import type {
	DoctorCredentialFacts,
	DoctorCredentialGroupChange,
	DoctorCredentialItem,
	DoctorCredentialKind,
	DoctorCredentialsFailure
} from '$modules/doctor-dashboard/api/credentials';
import {
	DOCTOR_CREDENTIAL_LIMIT,
	DOCTOR_CREDENTIAL_MIN_YEAR,
	DOCTOR_CREDENTIAL_ORGANIZATION_MAX_LENGTH,
	DOCTOR_CREDENTIAL_TITLE_MAX_LENGTH
} from '$modules/doctor-dashboard/config';

type Locale = 'el' | 'en';

const SEPARATOR = ' · ';

/** 🔴 D-W52-63: the three groups of «Βιογραφικό» in the page's order («Σπουδές · Εμπειρία · Συνέδρια»), the server's. */
export const DOCTOR_CV_KINDS: readonly DoctorCredentialKind[] = ['STUDY', 'WORK', 'CONFERENCE'];

/** A group's name over its rows; of «Σπουδές» and «Εμπειρία» the title of a row's own page too (`sw.js` `CV_ONE`). */
export function doctorCvGroupLabel(kind: DoctorCredentialKind, locale: Locale): string {
	const options = { locale };
	switch (kind) {
		case 'STUDY':
			return m.doctor_cv_group_study({}, options);
		case 'WORK':
			return m.doctor_cv_group_work({}, options);
		case 'CONFERENCE':
			return m.doctor_cv_group_conference({}, options);
	}
}

/** «Καμία ακόμη.» / «Κανένα ακόμη.»: what an empty group says, in its own gender. */
function noneOf(kind: DoctorCredentialKind, locale: Locale): string {
	const options = { locale };
	switch (kind) {
		case 'STUDY':
			return m.doctor_cv_none_study({}, options);
		case 'WORK':
			return m.doctor_cv_none_work({}, options);
		case 'CONFERENCE':
			return m.doctor_cv_none_conference({}, options);
	}
}

/**
 * 🔴 D-W52-63 («Όπως το διαβάζουν οι ασθενείς»): a row's years as the public page writes them — «2013 – 2015»,
 * «2015 – σήμερα», one year alone («2025»; a start and an end of the same year too); `null` without any.
 */
export function doctorCredentialYears(
	row: Pick<DoctorCredentialItem, 'startYear' | 'endYear' | 'isCurrent'>,
	locale: Locale
): string | null {
	const { startYear, endYear, isCurrent } = row;
	const end = isCurrent ? m.doctor_bio_present({}, { locale }) : endYear;
	if (startYear !== null && end !== null && String(end) !== String(startYear)) {
		return `${startYear} – ${end}`;
	}
	const only = startYear ?? endYear;
	return only === null ? null : String(only);
}

/** One line of a group: the row's id, its title, and under it «φορέας · 2013 – 2015» (`null` with neither). */
export type DoctorCvRow = { id: string; title: string; detail: string | null };

/** One group of the page: its name, its rows in the server's order, what it says empty, and whether it holds twenty. */
export type DoctorCvGroup = {
	kind: DoctorCredentialKind;
	label: string;
	none: string;
	rows: DoctorCvRow[];
	full: boolean;
};

/**
 * 🔴 U-210 · D-W52-63 (`64-switch/sw.js` `cvBody`): the three groups, ALWAYS all three and in their order, each with
 * its rows in the order the server answered (the current first, then the newest: nothing is sorted or dragged here).
 * A group that holds twenty is `full`: «Προσθήκη» gives its place to «Έως 20.».
 */
export function buildDoctorCvGroups(
	rows: readonly DoctorCredentialFacts[],
	locale: Locale
): DoctorCvGroup[] {
	return DOCTOR_CV_KINDS.map((kind) => {
		const own = rows.filter((row) => row.kind === kind);
		return {
			kind,
			label: doctorCvGroupLabel(kind, locale),
			none: noneOf(kind, locale),
			rows: own.map((row) => ({
				id: row.id,
				title: row.title,
				detail:
					[row.organization, doctorCredentialYears(row, locale)]
						.filter((part): part is string => Boolean(part))
						.join(SEPARATOR) || null
			})),
			full: own.length >= DOCTOR_CREDENTIAL_LIMIT
		};
	});
}

/** «Έως 20.»: what stands in the place of «Προσθήκη» in a group that holds its twenty. */
export function doctorCvLimitText(locale: Locale): string {
	return m.doctor_cv_limit({ limit: DOCTOR_CREDENTIAL_LIMIT }, { locale });
}

/** What the page of one row holds while it is typed: every field a text, the years too, and the tick «σήμερα». */
export type DoctorCredentialValues = {
	title: string;
	organization: string;
	startYear: string;
	endYear: string;
	isCurrent: boolean;
};

/** The page of «Προσθήκη»: every field empty (U-214: nothing is ever filled in for the doctor). */
export function emptyDoctorCredentialValues(): DoctorCredentialValues {
	return { title: '', organization: '', startYear: '', endYear: '', isCurrent: false };
}

/** The page of a row that exists: the row as the server keeps it. */
export function toDoctorCredentialValues(row: DoctorCredentialItem): DoctorCredentialValues {
	return {
		title: row.title,
		organization: row.organization ?? '',
		startYear: row.startYear === null ? '' : String(row.startYear),
		endYear: row.isCurrent || row.endYear === null ? '' : String(row.endYear),
		isCurrent: row.isCurrent
	};
}

/**
 * The last year a row may name: NEXT year on the platform's calendar, the server's own bound (it reads its own clock
 * and checks again).
 */
export function doctorCredentialLastYear(now: number): number {
	return Number(zonedDay(now, PLATFORM_TIME_ZONE).slice(0, 4)) + 1;
}

/** What a year's field keeps of a keystroke or a paste: its digits, four at most (a letter leaves nothing behind). */
export function keepDoctorCredentialYearInput(value: string): string {
	return value.replace(/[^0-9]/gu, '').slice(0, 4);
}

/** A year as typed: `null` for an empty field, the number of four digits, `NaN` for anything else. */
function yearOf(text: string): number | null {
	const typed = text.trim();
	if (typed === '') return null;
	return /^[0-9]{4}$/u.test(typed) ? Number(typed) : Number.NaN;
}

const outOfRange = (year: number | null, lastYear: number) =>
	year !== null && !(year >= DOCTOR_CREDENTIAL_MIN_YEAR && year <= lastYear);

/** The fields of the page that have a rule, and the rules by name. */
export type DoctorCredentialField = 'title' | 'startYear' | 'endYear';
export type DoctorCredentialError = 'required' | 'year' | 'since' | 'fromNeeded' | 'order';

/**
 * 🔴 U-210 · D-W52-63 · U-65.6 (`sw.js` `cvErrs`, the server's own rules said before the save): the rule ONE field
 * breaks now, `null` for none.
 * - the title: something written;
 * - a year: four digits from 1950 to `lastYear`;
 * - «Έως»: needs «Από» and is not before it — and is not read at all under «σήμερα» or on a conference (one «Έτος»);
 * - «σήμερα» (never on a conference): needs «Από».
 */
export function doctorCredentialError(
	field: DoctorCredentialField,
	kind: DoctorCredentialKind,
	values: DoctorCredentialValues,
	lastYear: number
): DoctorCredentialError | null {
	if (field === 'title') return values.title.trim() ? null : 'required';
	const current = kind !== 'CONFERENCE' && values.isCurrent;
	const start = yearOf(values.startYear);
	const startBroken = outOfRange(start, lastYear);
	if (field === 'startYear') {
		if (startBroken) return 'year';
		return current && start === null ? 'since' : null;
	}
	const end = current || kind === 'CONFERENCE' ? null : yearOf(values.endYear);
	if (outOfRange(end, lastYear)) return 'year';
	if (end === null || startBroken) return null;
	if (start === null) return 'fromNeeded';
	return end < start ? 'order' : null;
}

/** Whether nothing of the page breaks a rule. */
export function isDoctorCredentialValid(
	kind: DoctorCredentialKind,
	values: DoctorCredentialValues,
	lastYear: number
): boolean {
	return (['title', 'startYear', 'endYear'] as const).every(
		(field) => doctorCredentialError(field, kind, values, lastYear) === null
	);
}

/**
 * 🔴 U-140 (`81-cv.html` «Λάθη», word for word): the words of each rule by field — «Γράψτε τον τίτλο.» / «τη θέση.» /
 * «το συνέδριο.», «Γράψτε έτος από 1950 έως 2027.», «Γράψτε από πότε.», «Γράψτε και το «Από».», «Το «Έως» δεν μπορεί
 * να είναι πριν από το «Από».».
 */
export function doctorCredentialMessages(
	kind: DoctorCredentialKind,
	locale: Locale,
	lastYear: number
): Record<DoctorCredentialField, Partial<Record<DoctorCredentialError, string>>> {
	const options = { locale };
	const year = m.doctor_cv_error_year(
		{ first: DOCTOR_CREDENTIAL_MIN_YEAR, last: lastYear },
		options
	);
	const required = {
		STUDY: () => m.doctor_cv_error_study_title({}, options),
		WORK: () => m.doctor_cv_error_work_title({}, options),
		CONFERENCE: () => m.doctor_cv_error_conference_title({}, options)
	}[kind]();
	return {
		title: { required },
		startYear: { year, since: m.doctor_cv_error_since({}, options) },
		endYear: {
			year,
			fromNeeded: m.doctor_cv_error_from_needed({}, options),
			order: m.doctor_cv_error_order({}, options)
		}
	};
}

/**
 * 🔴 D-W52-61 / 63: the row «Αποθήκευση» makes of the page — the texts trimmed and cut at the server's bounds, an
 * empty organization `null`, the years numbers; under «σήμερα» no end; a conference has ONE year, sent as its start,
 * and is never «σήμερα». `null` while anything breaks a rule: nothing is sent.
 */
export function toDoctorCredentialItem(
	kind: DoctorCredentialKind,
	values: DoctorCredentialValues,
	lastYear: number
): DoctorCredentialItem | null {
	if (!isDoctorCredentialValid(kind, values, lastYear)) return null;
	const isCurrent = kind !== 'CONFERENCE' && values.isCurrent;
	return {
		title: values.title.trim().slice(0, DOCTOR_CREDENTIAL_TITLE_MAX_LENGTH),
		organization:
			values.organization.trim().slice(0, DOCTOR_CREDENTIAL_ORGANIZATION_MAX_LENGTH) || null,
		startYear: yearOf(values.startYear),
		endYear: isCurrent || kind === 'CONFERENCE' ? null : yearOf(values.endYear),
		isCurrent
	};
}

/** What a row the doctor did not touch says, to send it back as it is. */
const itemOf = (row: DoctorCredentialFacts): DoctorCredentialItem => ({
	title: row.title,
	organization: row.organization,
	startYear: row.startYear,
	endYear: row.endYear,
	isCurrent: row.isCurrent
});

/**
 * 🔴 D-W52-63: the WHOLE group to send for ONE saved row, made on the rows the server keeps NOW — the row under `id`
 * takes what the page says, in its own place; a new one (`id` `null`) goes last. Every other row goes back as the
 * server has it. Nothing to send when the row is no longer there (`gone`) or the group holds its twenty (`full`).
 */
export function doctorCredentialSaved(
	id: string | null,
	item: DoctorCredentialItem
): DoctorCredentialGroupChange {
	return (rows) => {
		if (id === null) {
			return rows.length >= DOCTOR_CREDENTIAL_LIMIT
				? { refusal: 'full' }
				: { items: [...rows.map(itemOf), item] };
		}
		return rows.some((row) => row.id === id)
			? { items: rows.map((row) => (row.id === id ? item : itemOf(row))) }
			: { refusal: 'gone' };
	};
}

/** 🔴 D-W52-63: the WHOLE group without the row under `id`, made on the rows the server keeps NOW (`gone`: not there). */
export function doctorCredentialRemoved(id: string): DoctorCredentialGroupChange {
	return (rows) =>
		rows.some((row) => row.id === id)
			? { items: rows.filter((row) => row.id !== id).map(itemOf) }
			: { refusal: 'gone' };
}

/** The words of the page of one row, by its group (`sw.js` `CV_ONE`, `CV_LBL`). */
export type DoctorCredentialTexts = {
	/** The page's title: «Σπουδές», «Εμπειρία», «Συνέδριο». */
	heading: string;
	title: string;
	titleExample: string;
	organization: string;
	organizationExample: string;
	/** «Σε εξέλιξη» / «Εργάζομαι εδώ σήμερα»; `null` for a conference, which has no such tick. */
	current: string | null;
};

/** 🔴 U-140: «Τίτλος · Ίδρυμα», «Θέση · Φορέας», «Συνέδριο · Διοργανωτής», each with its example and its tick. */
export function doctorCredentialTexts(
	kind: DoctorCredentialKind,
	locale: Locale
): DoctorCredentialTexts {
	const options = { locale };
	switch (kind) {
		case 'STUDY':
			return {
				heading: doctorCvGroupLabel(kind, locale),
				title: m.doctor_cv_field_study_title({}, options),
				titleExample: m.doctor_cv_example_study_title({}, options),
				organization: m.doctor_cv_field_study_organization({}, options),
				organizationExample: m.doctor_cv_example_study_organization({}, options),
				current: m.doctor_cv_current_study({}, options)
			};
		case 'WORK':
			return {
				heading: doctorCvGroupLabel(kind, locale),
				title: m.doctor_cv_field_work_title({}, options),
				titleExample: m.doctor_cv_example_work_title({}, options),
				organization: m.doctor_cv_field_work_organization({}, options),
				organizationExample: m.doctor_cv_example_work_organization({}, options),
				current: m.doctor_cv_current_work({}, options)
			};
		case 'CONFERENCE':
			return {
				heading: m.doctor_cv_item_conference({}, options),
				title: m.doctor_cv_field_conference_title({}, options),
				titleExample: m.doctor_cv_example_conference_title({}, options),
				organization: m.doctor_cv_field_conference_organization({}, options),
				organizationExample: m.doctor_cv_example_conference_organization({}, options),
				current: null
			};
	}
}

/**
 * 🔴 D-W52-63: the page's words for a save that did not happen — a group the server will not take; a row that is no
 * longer there; a group that holds its twenty («Έως 20.»); too many writes; anything else — a write that met another,
 * one that was not allowed, the connection — that the change was not saved. `session` has no words: the session's own
 * page takes over.
 */
export function doctorCredentialsFailureText(
	failure: Exclude<DoctorCredentialsFailure, 'session'>,
	locale: Locale
): string {
	const options = { locale };
	switch (failure) {
		case 'invalid':
			return m.doctor_cv_error_invalid({}, options);
		case 'gone':
			return m.doctor_cv_missing({}, options);
		case 'full':
			return doctorCvLimitText(locale);
		case 'rate-limited':
			return m.doctor_reason_rate_limited({}, options);
		case 'conflict':
		case 'forbidden':
		case 'unknown':
			return m.doctor_my_specializations_error_failed({}, options);
	}
}

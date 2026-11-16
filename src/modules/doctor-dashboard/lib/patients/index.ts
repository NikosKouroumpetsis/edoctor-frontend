import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import {
	doctorAppointmentStatusPill,
	type AppointmentStatusPill
} from '$shared/lib/appointment-status';
import {
	APPOINTMENT_DAY_TIME_SEPARATOR,
	appointmentDayTime,
	appointmentNearDayLabel,
	appointmentNearWhenLabel
} from '$shared/lib/appointment-when';
import {
	AFM_LENGTH,
	AMKA_LENGTH,
	greekIdDigits,
	Validators,
	type FormConfig
} from '$shared/lib/form';
import { mobilePhoneLine, type PhoneLine } from '$shared/lib/office';
import { bookerWordLabel } from '$shared/lib/relative-words';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorAppointmentFacts } from '$modules/doctor-dashboard/api/appointments';
import type {
	DoctorPatientCardFacts,
	DoctorPatientDetails,
	DoctorPatientKey,
	DoctorPatientMergeFailureFacts,
	DoctorPatientRecordFailureFacts,
	DoctorPatientRecordField,
	DoctorPatientRecordPatch,
	DoctorPatientRowFacts
} from '$modules/doctor-dashboard/api/patients';
import {
	doctorNewPatientForm,
	doctorPatientKeyOf,
	doctorPatientName,
	readDoctorGreekMobile
} from '$modules/doctor-dashboard/lib/new';
import { officeDayOffset } from '$modules/doctor-dashboard/lib/today';

/*
 * Wave 5.1 · screen 73 «Οι ασθενείς μου» in words (D-W51-73 … 76; 88 §73; `64-switch/sw.js:662-726` `ptsPage`, `ptBody`,
 * `ptEditPage`): the list's rows (the 55's), the card of one patient (WHOLE, U-182.7), «Στοιχεία ασθενή» of a record
 * and the join (U-198.2) — the very words and rules of the application's `lib/patients`. Every day on the platform's
 * calendar, «today» the server's (D-118).
 */

type Locale = SupportedLocale;

/** «22 Οκτωβρίου» (with the year when `withYear`; never a near day's word then), else «σήμερα» near today. */
function dayLabel(instant: string, now: number, locale: Locale, withYear = false): string | null {
	return appointmentNearDayLabel(instant, now, locale, PLATFORM_TIME_ZONE, withYear);
}

/**
 * 🔴 D-W51-74 (`sw.js:672-675`): when the next visit is — «σήμερα, 17:30» near today, else «Δευτέρα 16 Νοεμβρίου, 10:00»
 * — on the platform's calendar (a patient's list has no office's clock). The shared rule, the 74's lines too.
 */
export function doctorPatientWhenLabel(startTime: string, now: number, locale: Locale): string {
	return appointmentNearWhenLabel(startTime, now, locale, PLATFORM_TIME_ZONE);
}

/** «4 επισκέψεις» / «1 επίσκεψη». */
const visitsWord = (count: number, locale: Locale) =>
	count === 1
		? m.doctor_new_visits_one({ count }, { locale })
		: m.doctor_new_visits_other({ count }, { locale });

/**
 * 🔴 D-W51-74 (88 §73): the line under a name — «Αίτημα · σήμερα, 17:30», «Επόμενο: Δευτέρα 16 Νοεμβρίου, 11:00 · 4
 * επισκέψεις», else «5 επισκέψεις · τελευταία σήμερα»; nothing for a person with neither.
 */
function rowLine(patient: DoctorPatientRowFacts, now: number, locale: Locale): string | null {
	const options = { locale };
	const { next, visits } = patient;
	if (next) {
		const when = doctorPatientWhenLabel(next.startTime, now, locale);
		if (next.request) return m.doctor_patients_request({ when }, options);
		return visits.count > 0
			? m.doctor_patients_next_visits({ when, visits: visitsWord(visits.count, locale) }, options)
			: m.doctor_patients_next({ when }, options);
	}
	if (visits.count < 1) return null;
	const day = visits.lastAt ? dayLabel(visits.lastAt, now, locale) : null;
	if (!day) return visitsWord(visits.count, locale);
	return visits.count === 1
		? m.doctor_new_visits_last_one({ count: visits.count, date: day }, options)
		: m.doctor_new_visits_last_other({ count: visits.count, date: day }, options);
}

/** «Το κλείνει: Ελένη Μαυρίδη (μητέρα)» — the account holder, by the relative's relationship turned around. */
function bookedByLine(
	name: string | null,
	relationship: string | null,
	locale: Locale
): string | null {
	if (!name) return null;
	const word = relationship ? bookerWordLabel(relationship, locale) : '';
	return word
		? m.doctor_new_booked_by({ name, word }, { locale })
		: m.doctor_new_booked_by_name({ name }, { locale });
}

/** One row of «Οι ασθενείς μου» (the shared `PersonRows`), with the key of the card it opens. */
export type DoctorPatientListRow = {
	id: string;
	key: DoctorPatientKey;
	name: string;
	lines: string[];
	note: string | null;
};

/**
 * 🔴 D-W51-74 / U-112 (88 §73, the 55's rows, one under the other): one patient — the initials, the name, the next visit
 * or the visits, «Το κλείνει: …» for a relative, «Χωρίς λογαριασμό eDoctor» for a record; every word text.
 */
export function buildDoctorPatientListRow(
	patient: DoctorPatientRowFacts,
	now: number,
	locale: Locale
): DoctorPatientListRow {
	return {
		id: doctorPatientKeyOf(patient.key),
		key: patient.key,
		name: doctorPatientName(patient),
		lines: [
			rowLine(patient, now, locale),
			patient.bookedBy
				? bookedByLine(patient.bookedBy.name, patient.bookedBy.relationship, locale)
				: null
		].filter((line): line is string => Boolean(line)),
		note: patient.hasAccount ? null : m.doctor_new_no_account({}, { locale })
	};
}

/** Every page read so far as rows, each person once (pages that moved under the read keep the first). */
export function buildDoctorPatientListRows(
	patients: readonly DoctorPatientRowFacts[],
	now: number,
	locale: Locale
): DoctorPatientListRow[] {
	const rows: DoctorPatientListRow[] = [];
	for (const patient of patients) {
		const row = buildDoctorPatientListRow(patient, now, locale);
		if (!rows.some((kept) => kept.id === row.id)) rows.push(row);
	}
	return rows;
}

/** One appointment of the card: «Δευτέρα 16 Νοεμβρίου · 11:00», «Επανέλεγχος · 20 λεπτά · Πατησίων 45», its pill. */
export type DoctorPatientAppointmentRow = {
	id: string;
	title: string;
	subtitle: string;
	status: AppointmentStatusPill;
};

/**
 * 🔴 D-W51-75 (`sw.js:719` `.w-aprow`): one appointment of the card on the office's clock — «Σήμερα · 17:30» (αύριο, χθες)
 * near today, else the whole day; the service, its length and the office's street; its state in the doctor's words
 * (who canceled or refused it, as on 67). The whole row opens its 68.
 */
export function buildDoctorPatientAppointmentRow(
	appointment: DoctorAppointmentFacts,
	now: number,
	locale: Locale
): DoctorPatientAppointmentRow {
	const options = { locale };
	const zone = appointment.officeTimeZone;
	const parts = appointmentDayTime(appointment.startTime, locale, zone);
	const offset = officeDayOffset(appointment.startTime, now, zone);
	const near =
		offset === 0
			? m.appointments_relative_today({}, options)
			: offset === 1
				? m.appointments_relative_tomorrow({}, options)
				: offset === -1
					? m.doctor_appointment_yesterday({}, options)
					: null;
	const minutes = appointment.service?.durationInMinutes;
	const office =
		appointment.office?.translated.find((entry) => entry.language === locale)?.line ??
		appointment.office?.line ??
		null;
	const closedBy =
		appointment.status === 'rejected' ? appointment.rejectedBy : appointment.canceledBy;
	return {
		id: appointment.id,
		title: parts ? [near ?? parts.day, parts.time].join(APPOINTMENT_DAY_TIME_SEPARATOR) : '',
		subtitle: [
			appointment.service?.title ?? null,
			minutes && minutes > 0 ? m.doctor_today_minutes({ minutes }, options) : null,
			office
		]
			.filter(Boolean)
			.join(APPOINTMENT_DAY_TIME_SEPARATOR),
		status: doctorAppointmentStatusPill(appointment.status, closedBy, locale)
	};
}

/** One of a person's details: its label and the value WHOLE (U-182.7), `null` never given («Δεν έχει δοθεί»). */
export type DoctorPatientDetailRow = { id: string; label: string; value: string | null };

const GENDER_WORDS = {
	FEMALE: m.relatives_gender_female,
	MALE: m.relatives_gender_male,
	NON_BINARY: m.relatives_gender_non_binary,
	OTHER_GENE: m.relatives_gender_other
} as const;

/** «+30 697 765 4321» from the stored login form, else what was stored, else `null`. */
const phoneLabel = (phone: string | null) => mobilePhoneLine(phone)?.label ?? phone;

/** The rows of a person's own details, whole (U-182.7): Κινητό · Email · ΑΜΚΑ · ΑΦΜ. */
function detailRows(person: DoctorPatientDetails, locale: Locale): DoctorPatientDetailRow[] {
	const options = { locale };
	return [
		{
			id: 'phone',
			label: m.doctor_appointment_mobile({}, options),
			value: phoneLabel(person.phone)
		},
		{ id: 'email', label: m.doctor_appointment_email({}, options), value: person.email },
		{ id: 'amka', label: m.doctor_appointment_amka({}, options), value: person.amka },
		{ id: 'afm', label: m.doctor_appointment_afm({}, options), value: person.afm }
	];
}

/** The name the doctor knows a card by: the first and the last name, what there is. */
export function doctorPatientCardName(
	card: Pick<DoctorPatientCardFacts, 'firstName' | 'lastName'>
): string {
	return doctorPatientName(card);
}

/**
 * D-W51-75 (`sw.js:684` `stats`): «4 επισκέψεις · 1 φορά δεν ήρθε · πρώτη 3 Μαρτίου 2026», each part only when it is
 * there; a person with no visit and nothing missed reads «Πρώτη επίσκεψη σε εσάς».
 */
function statsLine(card: DoctorPatientCardFacts, now: number, locale: Locale): string {
	const options = { locale };
	const { visits, noShows } = card;
	const first = visits.firstAt ? dayLabel(visits.firstAt, now, locale, true) : null;
	const parts: string[] = [
		visits.count > 0 ? visitsWord(visits.count, locale) : null,
		noShows > 0
			? noShows === 1
				? m.doctor_patients_no_shows_one({ count: noShows }, options)
				: m.doctor_patients_no_shows_other({ count: noShows }, options)
			: null,
		visits.count > 0 && first ? m.doctor_patients_first({ date: first }, options) : null
	].filter((part) => part !== null);
	return parts.length > 0
		? parts.join(APPOINTMENT_DAY_TIME_SEPARATOR)
		: m.doctor_appointment_first_visit({}, options);
}

/** 🔴 D-W51-75: the card of one patient, in words. */
export type DoctorPatientCardContent = {
	name: string;
	stats: string;
	/** «Χωρίς λογαριασμό eDoctor», «Το κλείνει: …» under the name. */
	tags: { id: string; label: string }[];
	/** «Κλήση»: the account holder's mobile for a relative, else the person's own. */
	call: PhoneLine | null;
	/** «Στοιχεία», or «Ασθενής» for a relative. */
	dataTitle: string;
	rows: DoctorPatientDetailRow[];
	/** For a relative, the account holder who books: «Το κλείνει: …» and their details whole. */
	booker: { title: string; rows: DoctorPatientDetailRow[] } | null;
	/** Who changes the details. */
	note: string;
	/** «Επεξεργασία» (the doctor's own record, not joined). */
	editable: boolean;
	/** 🔴 U-198.2: «Ίσως είναι ο ίδιος με τον λογαριασμό …» with «Ένωση», for a record only. */
	merge: { body: string; patientId: string } | null;
};

/**
 * 🔴 U-182.7 / D-W51-75 (`ptBody`): one patient's card — the name, the counters and the tags; «Κλήση» (the holder's
 * mobile for a relative); «Στοιχεία» WHOLE («Ασθενής» + «Το κλείνει: …» for a relative: the relative's ΑΜΚΑ and gender,
 * then the holder's details) with who may change them; «Επεξεργασία» for the doctor's own record; «Ένωση» when it may be
 * the same as an account (U-198.2). «Ημερομηνία γέννησης» is never sent (D-W51-65), so it is never drawn.
 */
export function buildDoctorPatientCard(
	card: DoctorPatientCardFacts,
	now: number,
	locale: Locale
): DoctorPatientCardContent {
	const options = { locale };
	const isRecord = card.key.kind === 'record';
	const isRelative = card.key.kind === 'relative';
	const booker = isRelative && card.bookedBy ? card.bookedBy : null;
	const bookerTitle = booker
		? bookedByLine(doctorPatientName(booker) || null, card.relationship, locale)
		: null;
	const genderWord =
		card.gender && Object.hasOwn(GENDER_WORDS, card.gender)
			? GENDER_WORDS[card.gender as keyof typeof GENDER_WORDS]({}, options)
			: null;
	const candidate = isRecord && card.editable ? card.mergeCandidate : null;
	const added = card.addedAt ? dayLabel(card.addedAt, now, locale, true) : null;
	return {
		name: doctorPatientCardName(card),
		stats: statsLine(card, now, locale),
		tags: [
			...(card.hasAccount
				? []
				: [{ id: 'no-account', label: m.doctor_new_no_account({}, options) }]),
			...(bookerTitle ? [{ id: 'booked-by', label: bookerTitle }] : [])
		],
		call: mobilePhoneLine(booker ? booker.phone : card.phone),
		dataTitle: isRelative
			? m.doctor_appointment_patient({}, options)
			: m.doctor_patients_data({}, options),
		rows: isRelative
			? [
					{ id: 'amka', label: m.doctor_appointment_amka({}, options), value: card.amka },
					...(genderWord
						? [{ id: 'gender', label: m.doctor_appointment_gender({}, options), value: genderWord }]
						: [])
				]
			: detailRows(card, locale),
		booker: booker && bookerTitle ? { title: bookerTitle, rows: detailRows(booker, locale) } : null,
		note: isRecord
			? m.doctor_patients_note_record({ date: added ?? '' }, options)
			: isRelative
				? m.doctor_patients_note_relative({}, options)
				: m.doctor_patients_note_account({}, options),
		editable: isRecord && card.editable,
		merge: candidate
			? {
					body: m.doctor_patients_merge_box({ name: doctorPatientName(candidate) }, options),
					patientId: candidate.key.id
				}
			: null
	};
}

/** «Στοιχεία ασθενή» as the shared form keeps it: the six fields, each as typed. */
export type DoctorPatientRecordValues = {
	firstName: string;
	lastName: string;
	phone: string;
	email: string;
	amka: string;
	afm: string;
};

/** The values the form opens with: the record as the doctor keeps it, the mobile as it is shown («+30 697 …»). */
export function toDoctorPatientRecordValues(
	card: DoctorPatientCardFacts
): DoctorPatientRecordValues {
	return {
		firstName: card.firstName ?? '',
		lastName: card.lastName ?? '',
		phone: (mobilePhoneLine(card.phone)?.label ?? card.phone ?? '').replace(/\s/gu, ' '),
		email: card.email ?? '',
		amka: card.amka ?? '',
		afm: card.afm ?? ''
	};
}

/**
 * 🔴 D-W51-76 · U-65.6 (the server's bounds, D-W51-66): «Νέος ασθενής»'s rules for the names, the mobile and the email
 * (screen 72, one word of 1–80 letters each, a Greek mobile of 10 digits, an email of 254 at most) and the ΑΜΚΑ / ΑΦΜ
 * of the relatives' form (U-121.3: 11 / 9 digits, then the date and the check digit of `GreekIdPolicy`) — said before
 * the write, the server checks them again.
 */
export function doctorPatientRecordForm(
	locale: Locale
): Omit<FormConfig<DoctorPatientRecordValues>, 'onSubmit'> {
	const options = { locale };
	const base = doctorNewPatientForm(locale);
	return {
		initialValues: { firstName: '', lastName: '', phone: '', email: '', amka: '', afm: '' },
		validators: {
			...base.validators,
			amka: [Validators.pattern(new RegExp(`^[0-9]{${AMKA_LENGTH}}$`, 'u')), Validators.amkaDate],
			afm: [Validators.pattern(new RegExp(`^[0-9]{${AFM_LENGTH}}$`, 'u')), Validators.afmCheckDigit]
		},
		messages: {
			...base.messages,
			amka: {
				pattern: m.relatives_errors_amka({}, options),
				amkaDate: m.relatives_errors_amka_invalid({}, options)
			},
			afm: {
				pattern: m.relatives_errors_afm({}, options),
				afmCheckDigit: m.relatives_errors_afm_invalid({}, options)
			}
		}
	};
}

/** What the ΑΜΚΑ / ΑΦΜ field keeps of a keystroke or a paste: its digits only (the server's reading), 11 / 9 at most. */
export function keepDoctorPatientIdInput(field: 'amka' | 'afm', value: string): string {
	return greekIdDigits(value).slice(0, field === 'amka' ? AMKA_LENGTH : AFM_LENGTH);
}

/**
 * 🔴 D-W51-66: the change «Αποθήκευση» sends — every field, the names trimmed, the mobile as its 10 digits, an emptied
 * optional one as `null` (the server clears it) — or `null` while anything breaks a rule.
 */
export function toDoctorPatientRecordPatch(
	values: DoctorPatientRecordValues
): DoctorPatientRecordPatch | null {
	const config = doctorPatientRecordForm('el');
	const fields = Object.keys(config.validators ?? {}) as (keyof DoctorPatientRecordValues)[];
	const valid = fields.every((field) =>
		(config.validators?.[field] ?? []).every((rule) => rule(values[field]) === null)
	);
	const phone = readDoctorGreekMobile(values.phone);
	if (!valid || !phone) return null;
	return {
		firstName: values.firstName.trim(),
		lastName: values.lastName.trim(),
		phone,
		email: values.email.trim() || null,
		amka: greekIdDigits(values.amka) || null,
		afm: greekIdDigits(values.afm) || null
	};
}

/** The words a refused field wears under it (`422`): the rule it broke, by field (the id's «δεν είναι έγκυρο» apart). */
export function doctorPatientRecordFieldMessage(
	field: DoctorPatientRecordField,
	failure: DoctorPatientRecordFailureFacts,
	locale: Locale
): string {
	const options = { locale };
	switch (field) {
		case 'firstName':
			return m.relatives_errors_first_name_letters({}, options);
		case 'lastName':
			return m.relatives_errors_last_name_letters({}, options);
		case 'phone':
			return m.doctor_new_phone_invalid({}, options);
		case 'email':
			return m.relatives_errors_email({}, options);
		case 'amka':
			return failure.invalidIds.includes('amka')
				? m.relatives_errors_amka_invalid({}, options)
				: m.relatives_errors_amka({}, options);
		default:
			return failure.invalidIds.includes('afm')
				? m.relatives_errors_afm_invalid({}, options)
				: m.relatives_errors_afm({}, options);
	}
}

/**
 * 🔴 D-W51-76: how a refused «Αποθήκευση» reads — 409 «δεν αλλάζει πια» (joined to an account), 404 / 403 the card is
 * gone, 422 the general words over the fields, too many, else «δοκιμάστε ξανά»; `null` for the session (its sign-in).
 */
export function doctorPatientRecordFailureMessage(
	failure: DoctorPatientRecordFailureFacts,
	locale: Locale
): string | null {
	const options = { locale };
	switch (failure.kind) {
		case 'session':
			return null;
		case 'merged':
			return m.doctor_patients_edit_merged({}, options);
		case 'missing':
			return m.doctor_patients_edit_gone({}, options);
		case 'invalid':
			return m.relatives_failure_invalid({}, options);
		case 'rate-limited':
			return m.booking_details_errors_rate_limited({}, options);
		default:
			return m.doctor_patients_edit_failed({}, options);
	}
}

/**
 * 🔴 U-198.2 (no prototype, the 73's look): what the join screen says — the two names, that the card becomes one with
 * every visit, that the patient's app does not change and that it is not undone.
 */
export function buildDoctorPatientMergeLines(
	card: Pick<DoctorPatientCardFacts, 'firstName' | 'lastName' | 'mergeCandidate'>,
	locale: Locale
): string[] {
	const options = { locale };
	const account = card.mergeCandidate ? doctorPatientName(card.mergeCandidate) : '';
	return [
		m.doctor_patients_merge_one({ record: doctorPatientName(card), account }, options),
		m.doctor_patients_merge_app({}, options),
		m.doctor_patients_merge_final({}, options)
	];
}

/** 🔴 D-W51-67: how a refused join reads — no longer possible, too many, else again; `null` for the session. */
export function doctorPatientMergeFailureMessage(
	failure: DoctorPatientMergeFailureFacts,
	locale: Locale
): string | null {
	const options = { locale };
	switch (failure.kind) {
		case 'session':
			return null;
		case 'gone':
			return m.doctor_patients_merge_gone({}, options);
		case 'rate-limited':
			return m.booking_details_errors_rate_limited({}, options);
		default:
			return m.doctor_patients_merge_failed({}, options);
	}
}

/** What a write of a record's card just did: «Στοιχεία ασθενή» saved, or the join. */
export type DoctorPatientDone = 'saved' | 'merged';

/** The card's green box after a write: «Αποθηκεύτηκε.» or «Οι καρτέλες ενώθηκαν.». */
export function doctorPatientDoneMessage(done: DoctorPatientDone, locale: Locale): string {
	return done === 'saved'
		? m.doctor_patients_saved({}, { locale })
		: m.doctor_patients_merge_done({}, { locale });
}

/**
 * 🔴 U-193.1 · D-W51-87 (the application's `readCardAppointmentLine`): what a conversation the doctor starts from a card
 * reads before the server holds it — the name of the account that will hold it (the one who books, for a relative), the
 * appointment it is about (the nearest open one ahead — a `pending` one a request —, else the last visit; for a relative,
 * who it is for), and the conversation the card already names. A record has none: it has no account (D-W51-71).
 */
export type DoctorPatientConversationFacts = {
	name: string;
	line: {
		kind: 'upcoming' | 'request' | 'lastVisit';
		startTime: string;
		forRelative: {
			firstName: string | null;
			lastName: string | null;
			relation: string | null;
		} | null;
	} | null;
	conversationId: string | null;
};

const OPEN_STATUSES: readonly string[] = ['pending', 'booked', 'checked_in'];

export function doctorPatientConversationFacts(
	card: DoctorPatientCardFacts
): DoctorPatientConversationFacts | null {
	if (card.key.kind === 'record' || !card.hasAccount) return null;
	const isRelative = card.key.kind === 'relative';
	const forRelative = isRelative
		? { firstName: card.firstName, lastName: card.lastName, relation: card.relationship }
		: null;
	const next = card.upcoming.items
		.filter(
			(item) => OPEN_STATUSES.includes(item.status) && !Number.isNaN(Date.parse(item.startTime))
		)
		.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))[0];
	const line: DoctorPatientConversationFacts['line'] = next
		? {
				kind: next.status === 'pending' ? 'request' : 'upcoming',
				startTime: next.startTime,
				forRelative
			}
		: card.visits.lastAt
			? { kind: 'lastVisit', startTime: card.visits.lastAt, forRelative }
			: null;
	return {
		name: doctorPatientName(isRelative && card.bookedBy ? card.bookedBy : card),
		line,
		conversationId: card.conversationId
	};
}

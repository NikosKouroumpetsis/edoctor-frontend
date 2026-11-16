import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import {
	APPOINTMENT_DAY_TIME_SEPARATOR,
	appointmentDayMonthLabel,
	appointmentDayTimeLabel
} from '$shared/lib/appointment-when';
import { Validators, type FormConfig } from '$shared/lib/form';
import { formatEuro } from '$shared/lib/format';
import { mobilePhoneLine } from '$shared/lib/office';
import { bookerWordLabel } from '$shared/lib/relative-words';
import { clampTextLength } from '$shared/lib/text';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorNewAppointmentRequest,
	DoctorServiceFacts
} from '$modules/doctor-dashboard/api/appointments';
import type { DoctorOfficeFacts } from '$modules/doctor-dashboard/api/offices';
import type { DoctorPatientFacts, DoctorPatientKey } from '$modules/doctor-dashboard/api/patients';
import {
	DOCTOR_NEW_PATIENT_EMAIL_MAX_LENGTH,
	DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH,
	DOCTOR_PATIENT_SEARCH_MAX_LENGTH
} from '$modules/doctor-dashboard/config';

/*
 * Wave 5.1 · screen 72 «Νέο ραντεβού» in words (D-W51-69 / 70; 88 §72; `64-switch/sw.js:593-659` `newPage`): the patient
 * (the search of «οι ασθενείς μου», or «Νέος ασθενής» — U-197.3: name, surname, mobile, the email optional), the office
 * (only with more than one), ONE service, the doctor's REAL free hours (screen 70's), the summary with «Ενημέρωση», and
 * the one write that books it confirmed (U-197.2).
 */

/** The key of a patient as one string (a row's identity, the chosen one's). */
export const doctorPatientKeyOf = (key: DoctorPatientKey) => `${key.kind}:${key.id}`;

/** The patient's name as the doctor reads it: the first and the last, what there is. */
export function doctorPatientName(patient: Pick<DoctorPatientFacts, 'firstName' | 'lastName'>) {
	return [patient.firstName, patient.lastName].filter(Boolean).join(' ');
}

/** «4 επισκέψεις · τελευταία 22 Οκτωβρίου» (`sw.js:594`); `null` for none yet (the row then says only the mobile). */
export function doctorPatientVisitsLabel(
	visits: DoctorPatientFacts['visits'],
	locale: SupportedLocale
): string | null {
	if (visits.count < 1) return null;
	const date = visits.lastAt
		? appointmentDayMonthLabel(visits.lastAt, locale, PLATFORM_TIME_ZONE)
		: '';
	const options = { locale };
	const count = visits.count;
	if (!date) {
		return count === 1
			? m.doctor_new_visits_one({ count }, options)
			: m.doctor_new_visits_other({ count }, options);
	}
	return count === 1
		? m.doctor_new_visits_last_one({ count, date }, options)
		: m.doctor_new_visits_last_other({ count, date }, options);
}

/** «Το κλείνει: Ελένη Μαυρίδη (μητέρα)» for a relative: who books for them, by the relationship turned around. */
function bookedByLine(patient: DoctorPatientFacts, locale: SupportedLocale): string | null {
	const booker = patient.bookedBy;
	if (!booker?.name) return null;
	const word = booker.relationship ? bookerWordLabel(booker.relationship, locale) : '';
	return word
		? m.doctor_new_booked_by({ name: booker.name, word }, { locale })
		: m.doctor_new_booked_by_name({ name: booker.name }, { locale });
}

/**
 * One row of the search (D-W51-70, `sw.js:627`): the initials, the name, «{κινητό} · {επισκέψεις}», «Το κλείνει: …» for a
 * relative, «Χωρίς λογαριασμό eDoctor» where it holds (U-182.7: the mobile WHOLE).
 */
export type DoctorPatientRow = {
	id: string;
	name: string;
	lines: string[];
	note: string | null;
};

export function buildDoctorPatientRow(
	patient: DoctorPatientFacts,
	locale: SupportedLocale
): DoctorPatientRow {
	const phone = mobilePhoneLine(patient.phone)?.label ?? null;
	const visits = doctorPatientVisitsLabel(patient.visits, locale);
	const first = [phone, visits].filter(Boolean).join(APPOINTMENT_DAY_TIME_SEPARATOR);
	return {
		id: doctorPatientKeyOf(patient.key),
		name: doctorPatientName(patient),
		lines: [first, bookedByLine(patient, locale)].filter((line): line is string => Boolean(line)),
		note: patient.hasAccount ? null : m.doctor_new_no_account({}, { locale })
	};
}

/** The chosen patient's card (`sw.js:615`): whether it has an account, the name, the mobile, the visits. */
export type DoctorPickedCard = { label: string; name: string; lines: string[] };

export function buildDoctorPickedCard(
	patient: DoctorPatientFacts,
	locale: SupportedLocale
): DoctorPickedCard {
	const options = { locale };
	return {
		label: patient.hasAccount
			? m.doctor_new_has_account({}, options)
			: m.doctor_new_no_account({}, options),
		name: doctorPatientName(patient),
		lines: [
			mobilePhoneLine(patient.phone)?.label ?? null,
			bookedByLine(patient, locale),
			doctorPatientVisitsLabel(patient.visits, locale)
		].filter((line): line is string => Boolean(line))
	};
}

/** 🔴 U-65.6: the words of the search as the server takes them — 40 at most (a paste is cut, never half an emoji). */
export function clampDoctorPatientSearch(value: string): string {
	return clampTextLength(value, DOCTOR_PATIENT_SEARCH_MAX_LENGTH);
}

// _source: backend `shared/domain/policies/phone/Policy.ts` `GREEK_MOBILE_RE` (whitespace dropped first): `69` and 8
// digits, optionally after `30` / `+30`. Guarded by `tests/architecture/appointment-rules.test.ts`.
export const DOCTOR_GREEK_MOBILE = /^(?:\+?30)?(69\d{8})$/u;

/**
 * 🔴 U-197.3 · D-W51-54: a Greek mobile as the server reads it — the 10 digits from `69` («6985551212»), spaces and
 * `+30` / `30` allowed; `null` for anything else.
 */
export function readDoctorGreekMobile(value: string): string | null {
	const match = DOCTOR_GREEK_MOBILE.exec(value.replace(/\s+/gu, ''));
	return match ? (match[1] as string) : null;
}

/** «Νέος ασθενής» as the shared form keeps it (U-197.3): the name, the surname, the mobile, the email (optional). */
export type DoctorNewPatientValues = {
	firstName: string;
	lastName: string;
	phone: string;
	email: string;
};

export const emptyDoctorNewPatient: DoctorNewPatientValues = {
	firstName: '',
	lastName: '',
	phone: '',
	email: ''
};

const greekMobile = (value: unknown) =>
	typeof value !== 'string' || !value.trim() || readDoctorGreekMobile(value)
		? null
		: { greekMobile: true as const };

/**
 * 🔴 U-197.3 · U-65.6 (D-W51-54, the server's bounds): the names one word of 1–80 letters each (the relative's rule,
 * U-121.2), the mobile a Greek one of 10 digits (required), the email valid and of 254 at most (optional) — said before
 * the write, the server checks them again.
 */
export function doctorNewPatientForm(
	locale: SupportedLocale
): Omit<FormConfig<DoctorNewPatientValues>, 'onSubmit'> {
	const options = { locale };
	const name = [
		Validators.required,
		Validators.lettersOnly,
		Validators.maxLength(DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH)
	];
	const phone = m.doctor_new_phone_invalid({}, options);
	const email = m.relatives_errors_email({}, options);
	return {
		initialValues: { ...emptyDoctorNewPatient },
		validators: {
			firstName: name,
			lastName: name,
			phone: [Validators.required, greekMobile],
			email: [Validators.email, Validators.maxLength(DOCTOR_NEW_PATIENT_EMAIL_MAX_LENGTH)]
		},
		messages: {
			firstName: {
				required: m.relatives_errors_first_name({}, options),
				lettersOnly: m.relatives_errors_first_name_letters({}, options),
				maxLength: m.relatives_errors_first_name({}, options)
			},
			lastName: {
				required: m.relatives_errors_last_name({}, options),
				lettersOnly: m.relatives_errors_last_name_letters({}, options),
				maxLength: m.relatives_errors_last_name({}, options)
			},
			phone: { required: phone, greekMobile: phone },
			email: { email, maxLength: email }
		}
	};
}

/** Whether «Νέος ασθενής» is whole by the form's rules (the button sleeps until it is). */
export function isDoctorNewPatientComplete(values: DoctorNewPatientValues): boolean {
	const config = doctorNewPatientForm('el');
	return (Object.keys(config.validators ?? {}) as (keyof DoctorNewPatientValues)[]).every((field) =>
		(config.validators?.[field] ?? []).every((rule) => rule(values[field]) === null)
	);
}

/** The new patient as the write takes it: trimmed, the mobile as typed, the email only when there is one. */
export function toDoctorNewPatient(values: DoctorNewPatientValues) {
	const email = values.email.trim();
	return {
		firstName: values.firstName.trim(),
		lastName: values.lastName.trim(),
		phone: values.phone.trim(),
		...(email ? { email } : {})
	};
}

/** One choice of a list (the office, the service): its id, its bold words and the line under them. */
export type DoctorNewChoice = { value: string; label: string; detail: string };

/** «Ιατρείο» (`sw.js:633`): «Κηφισίας 120» and «Λεωφ. Κηφισίας 120, Αθήνα 115 26», in the page's language when written. */
export function buildDoctorNewOfficeChoices(
	offices: readonly DoctorOfficeFacts[],
	locale: SupportedLocale
): DoctorNewChoice[] {
	return offices.map((office) => {
		const line = office.lines.find((entry) => entry.language === locale) ?? office.lines[0];
		return { value: office.id, label: line?.line ?? '', detail: line?.address ?? '' };
	});
}

/** 🔴 D-W51-70: «Ιατρείο» shows only with more than one; with one it is that one. */
export function doctorNewOfficeShown(offices: readonly unknown[]): boolean {
	return offices.length > 1;
}

/** The channels a new appointment tells the patient by (U-197.1: the rules that hold today). */
export type DoctorNewChannel = 'app' | 'email' | 'sms';

/**
 * 🔴 D-W51-70 · U-197.1 · D-W51-07 (the server's `channel-policy`, BOOKED): an account is told in the application and by
 * email, and by SMS when the doctor's «SMS επιβεβαίωσης» is on; a patient without an account by email when the record
 * has one and by SMS on the same switch — never in an application.
 */
export function doctorNewChannels(input: {
	hasAccount: boolean;
	hasEmail: boolean;
	smsOn: boolean;
}): DoctorNewChannel[] {
	if (input.hasAccount) return ['app', 'email', ...(input.smsOn ? (['sms'] as const) : [])];
	return [
		...(input.hasEmail ? (['email'] as const) : []),
		...(input.smsOn ? (['sms'] as const) : [])
	];
}

const CHANNEL_WORDS = {
	app: m.doctor_new_channel_app,
	email: m.doctor_new_channel_email,
	sms: m.doctor_new_channel_sms
} as const satisfies Record<DoctorNewChannel, unknown>;

/** «Εφαρμογή · email · SMS», «Email · SMS» (`sw.js:647`: the first with a capital), «Καμία» for none. */
export function doctorNewChannelsLabel(
	channels: readonly DoctorNewChannel[],
	locale: SupportedLocale
): string {
	if (channels.length === 0) return m.doctor_new_channel_none({}, { locale });
	return channels
		.map((channel, index) => {
			const word = CHANNEL_WORDS[channel]({}, { locale });
			return index === 0 ? word.charAt(0).toLocaleUpperCase(locale) + word.slice(1) : word;
		})
		.join(APPOINTMENT_DAY_TIME_SEPARATOR);
}

/**
 * 🔴 D-W51-70 (`sw.js:648`): under the summary — always «Το ραντεβού κλείνεται επιβεβαιωμένο.» (U-197.2); with an SMS
 * «Το SMS χρεώνεται στα πακέτα σας (υπόλοιπο {n}).» (the number only when the server said it); with no channel at all
 * «Ο ασθενής δεν έχει email και το SMS είναι κλειστό: πείτε του την ώρα στο τηλέφωνο.».
 */
export function doctorNewSummaryNote(input: {
	channels: readonly DoctorNewChannel[];
	balance: number | null;
	locale: SupportedLocale;
}): string {
	const options = { locale: input.locale };
	return [
		m.doctor_new_booked_confirmed({}, options),
		input.channels.includes('sms')
			? input.balance === null
				? m.doctor_new_sms_charged_plain({}, options)
				: m.doctor_new_sms_charged({ n: input.balance }, options)
			: null,
		input.channels.length === 0 ? m.doctor_new_tell_by_phone({}, options) : null
	]
		.filter(Boolean)
		.join(' ');
}

/** «Δευτέρα 16 Νοεμβρίου · 13:30» on the office's clock. */
export function doctorNewWhenLabel(startTime: string, timeZone: string, locale: SupportedLocale) {
	return appointmentDayTimeLabel(startTime, locale, timeZone);
}

/**
 * 🔴 D-W51-70 (`sw.js:647`): «Ασθενής · Ιατρείο · Υπηρεσία · Πότε · Κόστος · Ενημέρωση» — the service with its length,
 * the cost its price.
 */
export function buildDoctorNewSummaryRows(input: {
	patientName: string;
	office: DoctorNewChoice;
	service: DoctorServiceFacts;
	when: string;
	channels: readonly DoctorNewChannel[];
	locale: SupportedLocale;
}) {
	const options = { locale: input.locale };
	return [
		{ id: 'patient', label: m.doctor_appointment_patient({}, options), value: input.patientName },
		{ id: 'office', label: m.booking_summary_office({}, options), value: input.office.label },
		{
			id: 'service',
			label: m.doctor_new_service({}, options),
			value: [
				input.service.title,
				m.doctor_today_minutes({ minutes: input.service.durationInMinutes }, options)
			].join(APPOINTMENT_DAY_TIME_SEPARATOR)
		},
		{ id: 'when', label: m.doctor_new_when({}, options), value: input.when },
		{
			id: 'cost',
			label: m.booking_summary_price({}, options),
			value: formatEuro(input.service.price, input.locale)
		},
		{
			id: 'tell',
			label: m.doctor_new_tell({}, options),
			value: doctorNewChannelsLabel(input.channels, input.locale)
		}
	];
}

/** Who the new appointment is for: one of the doctor's people, or a new patient typed here. */
export type DoctorNewPerson =
	| { kind: 'patient'; patient: DoctorPatientFacts }
	| { kind: 'new'; values: DoctorNewPatientValues };

/**
 * 🔴 D-W51-56 · U-197.2 (U-65.6: only the server's ids and the form's checked words travel): the ONE write — the doctor,
 * the office, the hour, ONE service, `booked`, and exactly one person: an account (`patientId`, `bookedForType` and the
 * relative's id), the doctor's record (`patientRecordId`) or the new patient (`newPatient`).
 */
export function toDoctorNewAppointmentRequest(input: {
	doctorId: string;
	officeId: string;
	serviceId: string;
	startTime: string;
	person: DoctorNewPerson;
}): DoctorNewAppointmentRequest {
	const base = {
		doctorId: input.doctorId,
		officeId: input.officeId,
		startTime: input.startTime,
		status: 'booked' as const,
		services: [{ doctorServiceId: input.serviceId }]
	};
	if (input.person.kind === 'new') {
		return { ...base, newPatient: toDoctorNewPatient(input.person.values) };
	}
	const person = input.person.patient.person;
	if (person.kind === 'RECORD') return { ...base, patientRecordId: person.recordId };
	return person.relativeId
		? {
				...base,
				patientId: person.patientId,
				bookedForType: 'RELATIVE',
				relativeId: person.relativeId
			}
		: { ...base, patientId: person.patientId, bookedForType: 'SELF' };
}

/**
 * 🔴 D-W51-70: the people of the doctor who share the mobile typed («Έχετε ήδη ασθενή με αυτό το κινητό: {όνομα}.») —
 * the first named, a warning, never a refusal (a child may have a parent's mobile).
 */
export function doctorSamePhoneName(matches: readonly DoctorPatientFacts[]): string | null {
	const first = matches.find((patient) => doctorPatientName(patient));
	return first ? doctorPatientName(first) : null;
}

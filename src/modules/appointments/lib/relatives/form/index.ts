import { m } from '$paraglide/messages.js';
import type { FormConfig, ValidatorFn } from '$shared/lib/form';
import { AFM_LENGTH, AMKA_LENGTH, greekIdDigits, Validators } from '$shared/lib/form';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	BookingRelativeFailure,
	BookingRelativeGender,
	BookingRelativeInput,
	BookingRelativeRelationship,
	RelativeChangeFailure,
	RelativeFacts,
	RelativeUpdate
} from '$modules/appointments/api/relatives';
import {
	BOOKING_NAME_MAX_LENGTH,
	BOOKING_RELATIVE_EMAIL_MAX_LENGTH
} from '$modules/appointments/config';
import { cleanBookingName } from '$modules/appointments/lib/booking/details';

/*
 * «Νέος συγγενής»'s rules (wave 3, record §3.3) — since wave 4.0 the ONE form of a relative (P-W4 §4.6, D-W4-30: moved
 * from `lib/booking/relative`): the booking's «Νέος συγγενής», screen 52's «Προσθήκη συγγενή» and screen 55's new and
 * edited relative read it from here.
 */

/** The relationships the contract knows, in the order «Νέος συγγενής» offers them (record §3.3). */
export const BOOKING_RELATIONSHIPS = [
	'PARENT',
	'CHILD',
	'SPOUSE',
	'SIBLING',
	'OTHER_RELE'
] as const satisfies readonly BookingRelativeRelationship[];

/** The four genders of the contract (record §3.3: «Φύλο (4 τιμές)»). */
export const BOOKING_GENDERS = [
	'FEMALE',
	'MALE',
	'NON_BINARY',
	'OTHER_GENE'
] as const satisfies readonly BookingRelativeGender[];

/** What the form holds; the mobile sits beside it (its validity is the country's as well, the application's split). */
export type BookingRelativeValues = {
	firstName: string;
	lastName: string;
	relationship: string;
	gender: string;
	email: string;
	amka: string;
	afm: string;
};

/** A field of «Νέος συγγενής» by its name: the form's and the mobile beside it (W8-Σ2: the ones a refusal marks). */
export type BookingRelativeFieldName = keyof BookingRelativeValues | 'phone';

export const emptyBookingRelative: BookingRelativeValues = {
	firstName: '',
	lastName: '',
	relationship: '',
	gender: '',
	email: '',
	amka: '',
	afm: ''
};

/** The optional mobile, read: none typed, a number the parser composed (E.164), or one it could not. */
export type BookingRelativePhone =
	| { kind: 'absent' }
	| { kind: 'number'; value: string }
	| { kind: 'invalid' };

const isRelationship = (value: unknown): value is BookingRelativeRelationship =>
	(BOOKING_RELATIONSHIPS as readonly unknown[]).includes(value);
const isGender = (value: unknown): value is BookingRelativeGender =>
	(BOOKING_GENDERS as readonly unknown[]).includes(value);
const oneOf =
	(accepts: (value: unknown) => boolean): ValidatorFn =>
	(value) =>
		accepts(value) ? null : { required: true };

export function bookingRelationshipOptions(locale: SupportedLocale) {
	const options = { locale };
	const labels: Record<(typeof BOOKING_RELATIONSHIPS)[number], string> = {
		PARENT: m.relatives_relationship_parent({}, options),
		CHILD: m.relatives_relationship_child({}, options),
		SPOUSE: m.relatives_relationship_spouse({}, options),
		SIBLING: m.relatives_relationship_sibling({}, options),
		OTHER_RELE: m.relatives_relationship_other({}, options)
	};
	return BOOKING_RELATIONSHIPS.map((value) => ({ value, label: labels[value] }));
}

export function bookingGenderOptions(locale: SupportedLocale) {
	const options = { locale };
	const labels: Record<(typeof BOOKING_GENDERS)[number], string> = {
		FEMALE: m.relatives_gender_female({}, options),
		MALE: m.relatives_gender_male({}, options),
		NON_BINARY: m.relatives_gender_non_binary({}, options),
		OTHER_GENE: m.relatives_gender_other({}, options)
	};
	return BOOKING_GENDERS.map((value) => ({ value, label: labels[value] }));
}

/**
 * 🔴 U-65.6 · the rules the server enforces, stated before the write (the application's `buildRelativeValidators`): both
 * names, each ONE word of letters (U-121.2); a relationship and a gender of the contract's lists; an email that looks
 * like one; ΑΜΚΑ and ΑΦΜ their 11 / 9 digits, then the date and the check digit of `GreekIdPolicy` (U-121.3). Each
 * refusal says its own words; an empty name keeps «Συμπληρώστε το …».
 */
export function bookingRelativeForm(
	locale: SupportedLocale
): Omit<FormConfig<BookingRelativeValues>, 'onSubmit'> {
	const options = { locale };
	const firstName = m.relatives_errors_first_name({}, options);
	const lastName = m.relatives_errors_last_name({}, options);
	const name = [
		Validators.required,
		Validators.lettersOnly,
		Validators.maxLength(BOOKING_NAME_MAX_LENGTH)
	];
	return {
		initialValues: { ...emptyBookingRelative },
		validators: {
			firstName: name,
			lastName: name,
			relationship: [oneOf(isRelationship)],
			gender: [oneOf(isGender)],
			email: [Validators.email, Validators.maxLength(BOOKING_RELATIVE_EMAIL_MAX_LENGTH)],
			amka: [Validators.pattern(new RegExp(`^[0-9]{${AMKA_LENGTH}}$`, 'u')), Validators.amkaDate],
			afm: [Validators.pattern(new RegExp(`^[0-9]{${AFM_LENGTH}}$`, 'u')), Validators.afmCheckDigit]
		},
		messages: {
			firstName: {
				required: firstName,
				lettersOnly: m.relatives_errors_first_name_letters({}, options),
				maxLength: firstName
			},
			lastName: {
				required: lastName,
				lettersOnly: m.relatives_errors_last_name_letters({}, options),
				maxLength: lastName
			},
			relationship: { required: m.relatives_errors_relationship({}, options) },
			gender: { required: m.relatives_errors_gender({}, options) },
			email: {
				email: m.relatives_errors_email({}, options),
				maxLength: m.relatives_errors_email({}, options)
			},
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

/**
 * U-121.3 · the words under a ΑΜΚΑ / ΑΦΜ the server refused: its length's, or — the length right — «δεν είναι έγκυρο»
 * (the date, the check digit), the same as the form says before the write.
 */
export function bookingRelativeIdMessage(
	field: 'amka' | 'afm',
	invalid: boolean,
	locale: SupportedLocale
): string {
	const options = { locale };
	if (field === 'amka') {
		return invalid
			? m.relatives_errors_amka_invalid({}, options)
			: m.relatives_errors_amka({}, options);
	}
	return invalid
		? m.relatives_errors_afm_invalid({}, options)
		: m.relatives_errors_afm({}, options);
}

/**
 * The digits of what was typed or pasted, `length` at most (no sign, no space, no letter, no other script's digit): the
 * server's own reading (`greekIdDigits`, W9 Delta 1), cut at the id's length.
 */
const keepDigits = (value: string, length: number) => greekIdDigits(value).slice(0, length);

/**
 * A7 · what the ΑΜΚΑ field keeps of a keystroke or a paste: its digits only, eleven at most — as the project's other
 * number fields keep theirs (the postal code, the price). The server reads the digits alone too (`GreekIdPolicy`).
 */
export function keepBookingAmkaInput(value: string): string {
	return keepDigits(value, AMKA_LENGTH);
}

/** W8 Delta 1 · the ΑΦΜ the same way: its digits only, nine at most (the server keeps the digits alone too). */
export function keepBookingAfmInput(value: string): string {
	return keepDigits(value, AFM_LENGTH);
}

/**
 * The optional mobile (the application's `readRelativePhone`): what was typed, and what the SAME parser as the person's
 * own composed of it (E.164, or `null`). An empty field is «absent», not «wrong»: the contract does not ask for one.
 */
export function readBookingRelativePhone(
	typed: string,
	composed: string | null
): BookingRelativePhone {
	if (!typed.trim()) return { kind: 'absent' };
	return composed ? { kind: 'number', value: composed } : { kind: 'invalid' };
}

/**
 * THE body of the write (the application's `toRelativeInput` for a create): the names trimmed and cleaned, the two
 * enums only when both are the contract's, every optional field `null` when blank. `null` when it cannot be whole.
 */
export function toBookingRelativeInput(
	values: BookingRelativeValues,
	phone: BookingRelativePhone
): BookingRelativeInput | null {
	const firstName = cleanBookingName(values.firstName);
	const lastName = cleanBookingName(values.lastName);
	if (!firstName || !lastName || phone.kind === 'invalid') return null;
	if (!isRelationship(values.relationship) || !isGender(values.gender)) return null;
	return {
		firstName,
		lastName,
		relationship: values.relationship,
		gender: values.gender,
		phone: phone.kind === 'number' ? phone.value : null,
		email: values.email.trim() || null,
		amka: values.amka.trim() || null,
		afm: values.afm.trim() || null
	};
}

/**
 * Why adding a relative was refused, in words (P-B3-review A-4, 🔴 D-W3-32): the 21st relative its own sentence — the
 * `422` whose message carries `PATIENT_RELATIVES_LIMIT_REACHED` — any other refused field the general one, too many
 * writes the challenge's «Πολλές προσπάθειες…»; `null` for the session.
 */
export function bookingRelativeFailureMessage(
	failure: BookingRelativeFailure,
	locale: SupportedLocale
): string | null {
	const options = { locale };
	switch (failure) {
		case 'limit':
			return m.relatives_failure_limit_reached({}, options);
		case 'invalid':
			return m.relatives_failure_invalid({}, options);
		case 'rate-limited':
			return m.booking_details_errors_rate_limited({}, options);
		case 'session':
			return null;
		default:
			return m.relatives_failure_unknown({}, options);
	}
}

/**
 * Why changing or deleting a relative was refused (screen 55, P-W4 §4.6): a relative that is not the person's any more
 * says so («Αυτός ο συγγενής δεν είναι πια διαθέσιμος.»), the rest as the create says them; `null` for the session.
 */
export function relativeChangeFailureMessage(
	failure: RelativeChangeFailure,
	locale: SupportedLocale
): string | null {
	return failure === 'forbidden'
		? m.relatives_failure_forbidden({}, { locale })
		: bookingRelativeFailureMessage(failure, locale);
}

/**
 * Screen 55's «Επεξεργασία συγγενή» starts from what is on file (the application's `toRelativeValues`): the names, the
 * relationship and gender as spelled, every optional field blank when none.
 */
export function relativeFormValues(relative: RelativeFacts): BookingRelativeValues {
	return {
		firstName: relative.firstName,
		lastName: relative.lastName,
		relationship: relative.relationship,
		gender: relative.gender,
		email: relative.email ?? '',
		amka: relative.amka ?? '',
		afm: relative.afm ?? ''
	};
}

/** A stored E.164 mobile split the way its field holds it: the country's code, and the rest (`null`: no known code). */
export type RelativePhoneSplitter = (
	stored: string
) => { dialCode: string; national: string } | null;

/**
 * 🔴 The stored mobile in its field (the application's `toRelativePhoneValue`): the country in the chip, the rest in the
 * input, by the sign-in's own reading of a code (`split`); a number of another writer without `+` is tried as an
 * international one; a code the list does not know stays whole beside `fallbackDialCode`.
 */
export function relativePhoneValue(
	stored: string | null,
	split: RelativePhoneSplitter,
	fallbackDialCode: string
): { dialCode: string; number: string } {
	const value = stored?.trim() ?? '';
	const parts = value ? (split(value) ?? split(`+${value}`)) : null;
	return parts
		? { dialCode: parts.dialCode, number: parts.national }
		: { dialCode: fallbackDialCode, number: value };
}

/**
 * Screen 55's change (P-W4 §4.6, D-78): ONLY what differs from what is on file travels — the names trimmed and cleaned,
 * the two enums when they are the contract's, an optional field emptied as `null` (that is how the server clears it).
 * `{}` when nothing differs (no write is needed); `null` when the form cannot be whole.
 */
export function toRelativeUpdate(
	values: BookingRelativeValues,
	phone: BookingRelativePhone,
	stored: RelativeFacts
): RelativeUpdate | null {
	const whole = toBookingRelativeInput(values, phone);
	if (!whole) return null;
	const update: RelativeUpdate = {};
	if (whole.firstName !== stored.firstName) update.firstName = whole.firstName;
	if (whole.lastName !== stored.lastName) update.lastName = whole.lastName;
	if (whole.relationship !== stored.relationship) update.relationship = whole.relationship;
	if (whole.gender !== stored.gender) update.gender = whole.gender;
	if (whole.phone !== stored.phone) update.phone = whole.phone;
	if (whole.email !== stored.email) update.email = whole.email;
	if (whole.amka !== stored.amka) update.amka = whole.amka;
	if (whole.afm !== stored.afm) update.afm = whole.afm;
	return update;
}

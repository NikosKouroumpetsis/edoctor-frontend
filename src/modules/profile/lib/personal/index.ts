import { m } from '$paraglide/messages.js';
import { AFM_LENGTH, AMKA_LENGTH, greekIdDigits } from '$shared/lib/form';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	patientOnlyRows,
	PERSONAL_CODE_LENGTH,
	PERSONAL_RESEND_SECONDS,
	personalGenders,
	personalRows
} from '$modules/profile/config/personal';
import type {
	PersonalChallengeFailure,
	PersonalGender,
	PersonalIdKind,
	PersonalPerson,
	PersonalRow,
	PersonalRowId,
	PersonalWriteFailure
} from '$modules/profile/types';

type MessageOptions = { locale: SupportedLocale };

const genderWords: Record<PersonalGender, (options: MessageOptions) => string> = {
	FEMALE: (options) => m.relatives_gender_female({}, options),
	MALE: (options) => m.relatives_gender_male({}, options),
	NON_BINARY: (options) => m.relatives_gender_non_binary({}, options),
	OTHER_GENE: (options) => m.relatives_gender_other({}, options)
};

/** A gender in the page's language («Γυναίκα», «Άνδρας», «Μη δυαδικό», «Άλλο»). */
export function personalGenderWord(gender: PersonalGender, options: MessageOptions): string {
	return genderWords[gender](options);
}

/** The row's four choices, one under the other (U-112), in the record's order. */
export function personalGenderOptions(options: MessageOptions) {
	return personalGenders.map((value) => ({ value, label: personalGenderWord(value, options) }));
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/u;

/** «14 Μαρτίου 1988»: a day of birth (`YYYY-MM-DD`) in the page's language; `null` for what is no day. */
export function personalBirthDateWords(day: string | null, locale: SupportedLocale): string | null {
	const parts = day ? DAY.exec(day) : null;
	if (!parts) return null;
	const instant = Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
	if (Number.isNaN(instant)) return null;
	return new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(instant);
}

/** The instant the server keeps a day of birth as (`1988-03-14T00:00:00.000Z`, the booking's own write). */
export function toBirthDateInstant(day: string): string {
	return `${day}T00:00:00.000Z`;
}

const titles: Record<PersonalRowId, (options: MessageOptions) => string> = {
	name: (options) => m.profile_personal_name_title({}, options),
	dob: (options) => m.profile_personal_dob_title({}, options),
	gender: (options) => m.profile_personal_gender_title({}, options),
	email: (options) => m.profile_personal_email_title({}, options),
	phone: (options) => m.profile_personal_phone_title({}, options),
	amka: (options) => m.profile_personal_amka_title({}, options),
	afm: (options) => m.profile_personal_afm_title({}, options)
};

const helps: Record<PersonalRowId, ((options: MessageOptions) => string) | null> = {
	name: (options) => m.profile_personal_name_help({}, options),
	dob: (options) => m.profile_personal_dob_help({}, options),
	gender: null,
	email: (options) => m.profile_personal_email_help({}, options),
	phone: (options) => m.profile_personal_phone_help({}, options),
	amka: (options) => m.profile_personal_amka_help({}, options),
	afm: (options) => m.profile_personal_afm_help({}, options)
};

const text = (value: string | null | undefined) => value?.trim() || null;

/** What a row has on file, as the page prints it: the SERVER's own masks as they came (🔴 U-168: nothing is hidden here). */
function valueOf(
	id: PersonalRowId,
	person: PersonalPerson,
	options: MessageOptions
): string | null {
	switch (id) {
		case 'name':
			return text([text(person.firstName), text(person.lastName)].filter(Boolean).join(' '));
		case 'dob':
			return personalBirthDateWords(person.birthDate, options.locale);
		case 'gender':
			return person.gender ? personalGenderWord(person.gender, options) : null;
		case 'email':
			return text(person.maskedEmail);
		case 'phone':
			return text(person.maskedPhone);
		case 'amka':
			return text(person.maskedAmka);
		default:
			return text(person.maskedAfm);
	}
}

/**
 * The rows «Προσωπικά στοιχεία» shows, in the record's order and the page's language (record §5.3): «title · value ·
 * Επεξεργασία», or «Δεν έχει δοθεί · Προσθήκη». An account the server names no patient for reads only the rows that
 * have a source — the date of birth and the gender (`GET /user/me`), the email and the mobile (the two challenges) —
 * and of those two the page says no value at all: it cannot know one, and «Δεν έχει δοθεί» might be a lie.
 */
export function buildPersonalRows(person: PersonalPerson, options: MessageOptions): PersonalRow[] {
	return personalRows
		.filter((id) => person.hasPatientProfile || !patientOnlyRows.includes(id))
		.map((id) => {
			const value = valueOf(id, person, options);
			const unknown = !person.hasPatientProfile && (id === 'email' || id === 'phone');
			return {
				id,
				title: titles[id](options),
				value: unknown ? null : (value ?? m.profile_personal_none({}, options)),
				help: helps[id]?.(options) ?? null,
				filled: unknown || value !== null
			};
		});
}

/** The two halves of a name as they travel: trimmed; `null` when nothing differs from what is on file (no write). */
export function toNamePatch(
	typed: { firstName: string; lastName: string },
	stored: { firstName: string | null; lastName: string | null }
): { firstName: string; lastName: string } | null {
	const firstName = typed.firstName.trim();
	const lastName = typed.lastName.trim();
	if (firstName === (stored.firstName ?? '') && lastName === (stored.lastName ?? '')) return null;
	// Both halves together, as the booking's own write: the server refuses half a name.
	return { firstName, lastName };
}

const ID_LENGTHS: Record<PersonalIdKind, number> = { amka: AMKA_LENGTH, afm: AFM_LENGTH };

/** What an ΑΜΚΑ / ΑΦΜ field keeps of a keystroke or a paste: its digits alone, eleven / nine at most (the server's reading). */
export function keepPersonalIdInput(kind: PersonalIdKind, value: string): string {
	return greekIdDigits(value).slice(0, ID_LENGTHS[kind]);
}

/** «Το ΑΜΚΑ έχει 11 ψηφία.» / «…δεν είναι έγκυρο…»: the words under a number that is not one (the relative's own). */
export function personalIdMessage(
	kind: PersonalIdKind,
	reason: 'length' | 'invalid',
	options: MessageOptions
): string {
	if (kind === 'amka') {
		return reason === 'length'
			? m.relatives_errors_amka({}, options)
			: m.relatives_errors_amka_invalid({}, options);
	}
	return reason === 'length'
		? m.relatives_errors_afm({}, options)
		: m.relatives_errors_afm_invalid({}, options);
}

/** The field's label: «Νέο ΑΜΚΑ · 11 ψηφία» over a number on file (the field opens EMPTY, U-168), else «11 ψηφία». */
export function personalIdLabel(
	kind: PersonalIdKind,
	filled: boolean,
	options: MessageOptions
): string {
	if (kind === 'amka') {
		return filled
			? m.profile_personal_amka_new_label({}, options)
			: m.profile_personal_amka_label({}, options);
	}
	return filled
		? m.profile_personal_afm_new_label({}, options)
		: m.profile_personal_afm_label({}, options);
}

/** The words of a refused write; `null` for the session (the sign-in opens over the page). */
export function personalWriteFailureMessage(
	failure: PersonalWriteFailure,
	options: MessageOptions
): string | null {
	if (failure === 'session') return null;
	if (failure === 'birth-date') return m.profile_personal_dob_error({}, options);
	return m.profile_personal_errors_unknown({}, options);
}

/** The code as its field keeps it: digits only, six at most — whatever was typed or pasted (U-65.6). */
export function cleanPersonalCode(typed: string): string {
	return typed.replace(/\D/gu, '').slice(0, PERSONAL_CODE_LENGTH);
}

/**
 * The words of a refused step of a challenge (the server's table, `w45-58-clients-common.md`): the value's own under
 * step 1, the code's under step 2; `null` for the session.
 */
export function personalChallengeMessage(
	failure: PersonalChallengeFailure,
	channel: 'email' | 'phone',
	step: 'value' | 'code',
	options: MessageOptions
): string | null {
	switch (failure) {
		case 'session':
			return null;
		case 'taken':
			return channel === 'email'
				? m.profile_personal_email_errors_taken({}, options)
				: m.profile_personal_phone_errors_taken({}, options);
		case 'provider-google':
			return m.profile_personal_email_errors_provider_google({}, options);
		case 'provider-apple':
			return m.profile_personal_email_errors_provider_apple({}, options);
		case 'provider-both':
			return m.profile_personal_email_errors_provider_both({}, options);
		case 'invalid-code':
			return m.profile_personal_code_errors_invalid({}, options);
		case 'stale-code':
			return m.profile_personal_code_errors_stale({}, options);
		case 'rate-limited':
			return m.profile_personal_errors_rate_limited({}, options);
		case 'invalid-value':
			if (step === 'code') return m.profile_personal_code_errors_invalid({}, options);
			return channel === 'email'
				? m.profile_personal_email_errors_invalid({}, options)
				: m.profile_personal_phone_errors_invalid({}, options);
		default:
			return m.profile_personal_errors_unknown({}, options);
	}
}

/** When the next «Αποστολή ξανά» may go: 60 seconds after a send (the sign-in's cooldown). */
export function personalResendDeadline(now: number): number {
	return now + PERSONAL_RESEND_SECONDS * 1000;
}

/** Whole seconds left before that deadline (0 once it passed; a second begun counts whole). */
export function personalResendSecondsLeft(deadline: number | null, now: number): number {
	return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** «Περιμένετε 1 δευτερόλεπτο / 30 δευτερόλεπτα για νέο κωδικό.» */
export function personalResendWaitLabel(seconds: number, options: MessageOptions): string {
	return seconds === 1
		? m.profile_personal_code_resend_wait_one({ seconds }, options)
		: m.profile_personal_code_resend_wait_other({ seconds }, options);
}

/**
 * Where a code to a mobile went, as the page says it back («+30 *** *** 4567», the approved prototype): the country and
 * the last four digits of what the person has just typed.
 */
export function personalPhoneDestination(dialCode: string, typed: string): string {
	const digits = typed.replace(/\D/gu, '');
	return `${dialCode} *** *** ${digits.slice(-4)}`;
}

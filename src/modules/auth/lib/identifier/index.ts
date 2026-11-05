import {
	PHONE_COUNTRIES,
	DEFAULT_PHONE_DIAL_CODE
} from '$shared/ui/molecules/phone-field/countries';
import type { AuthIdentifier } from '$modules/auth/types';

const MINIMUM_PHONE_DIGITS = 6;
// _source: backend shared/schemas/phone.schema.ts:5 — the published `maxLength` of every mobile sent.
const MAXIMUM_PHONE_LENGTH = 16;
const PHONE_MODE_MINIMUM_DIGITS = 2;

const stripPhoneFormatting = (value: string) => value.replace(/[\s()-]/gu, '');

/** A national number is commonly written with a trunk `0` that E.164 does not carry. */
const toNationalDigits = (value: string) => value.replace(/\D/gu, '').replace(/^0+/u, '');

/**
 * Whether what is being typed reads as a phone number rather than an address (the application's `isPhoneEntry`): it
 * drives the field's country chip, so it answers from the first couple of digits.
 */
export function isPhoneEntry(raw: string): boolean {
	const value = stripPhoneFormatting(raw.trim());
	if (value.includes('@')) return false;
	if (value.startsWith('+')) return true;
	return /^\d+$/u.test(value) && value.length >= PHONE_MODE_MINIMUM_DIGITS;
}

/** Whether the text can still become a phone number: a single digit counts, so the chip does not fall back. */
export function isPhoneDraft(raw: string): boolean {
	const value = stripPhoneFormatting(raw.trim());
	return value.length > 0 && /^\+?\d*$/u.test(value);
}

/** Splits a prefix the visitor typed (`+30…`, `0030…`) into the country it names and the rest; `null` for no known one. */
export function readDialCode(raw: string): { dialCode: string; national: string } | null {
	const value = stripPhoneFormatting(raw.trim());
	const international = value.startsWith('00') ? `+${value.slice(2)}` : value;
	if (!international.startsWith('+')) return null;
	// Longest match first, so `+30` cannot win over `+357` for a Cypriot number.
	const dialCode = PHONE_COUNTRIES.map((country) => country.value)
		.sort((left, right) => right.length - left.length)
		.find((code) => international.startsWith(code));
	return dialCode ? { dialCode, national: international.slice(dialCode.length) } : null;
}

/**
 * Reads what the single entry field was given (the application's `parseAuthIdentifier`, the same rules: a test holds
 * them equal). An address as it is; digits composed into E.164. `null` means «do not send this».
 */
export function parseIdentifier(
	raw: string,
	dialCode: string = DEFAULT_PHONE_DIAL_CODE
): AuthIdentifier | null {
	const value = raw.trim();
	if (value.length === 0) return null;
	if (value.includes('@')) {
		const email = value.toLowerCase();
		return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/u.test(email) ? { email } : null;
	}
	const stripped = stripPhoneFormatting(value);
	if (!/^\+?\d+$/u.test(stripped)) return null;
	const typedPrefix = readDialCode(stripped);
	const national = toNationalDigits(typedPrefix ? typedPrefix.national : stripped);
	if (national.length < MINIMUM_PHONE_DIGITS) return null;
	const mobilePhone = typedPrefix
		? `${typedPrefix.dialCode}${national}`
		: stripped.startsWith('+')
			? stripped
			: stripped.startsWith('00')
				? `+${stripped.slice(2)}`
				: `${dialCode}${national}`;
	return mobilePhone.length > MAXIMUM_PHONE_LENGTH ? null : { mobilePhone };
}

/** The same identifier, whichever shape (`isAuthFlowIdentifier`): the same address or the same number. */
export function isSameIdentifier(left: AuthIdentifier | null, right: AuthIdentifier): boolean {
	if (!left) return false;
	return 'email' in left && 'email' in right
		? left.email === right.email
		: 'mobilePhone' in left && 'mobilePhone' in right && left.mobilePhone === right.mobilePhone;
}

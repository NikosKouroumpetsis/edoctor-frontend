import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/*
 * An office's floor in words, its phone as read and for `tel:`, said the same way by the doctor's profile and by a patient's
 * appointment (P-W4 Σ-26, D-W4-30: moved from `modules/doctor/lib/detail/labels`, a module never imports another).
 */

/**
 * «Ισόγειο» / «Υπόγειο» / «3ος»; `undefined` for no level. Review w4-w0 R1 MINOR-2: the ONE set of the floor's words,
 * the application's (`doctor.detail.office.floor*`), read by the profile, the appointment and the sign-up's office step;
 * the older `doctor_office_floor_{ground,basement,level}`, left without a reader, went with card w4-w9 (D-W4-74).
 */
export function officeFloorValue(
	floor: number | undefined,
	locale: SupportedLocale
): string | undefined {
	if (floor === undefined || !Number.isFinite(floor)) return undefined;
	const level = Math.trunc(floor);
	if (level === 0) return m.doctor_detail_office_floor_ground({}, { locale });
	if (level < 0) return m.doctor_detail_office_floor_basement({}, { locale });
	return m.doctor_detail_office_floor_level({ floor: level }, { locale });
}

/**
 * The office's phone as `tel:` takes it: digits and one leading `+` only (server data: nothing else reaches the
 * dialler); `undefined` when nothing is left.
 */
export function officeDialNumber(phone: string | undefined): string | undefined {
	const trimmed = phone?.trim();
	if (!trimmed) return undefined;
	const digits = trimmed.replace(/\D/gu, '');
	if (!digits) return undefined;
	return trimmed.startsWith('+') ? `+${digits}` : digits;
}

const NO_BREAK_SPACE = '\u00a0';
// A Greek number, with or without its country: 210 321 0101 (the application's `formatPhoneDisplay` groups).
const GREEK_NUMBER = /^(?:30)?(\d{3})(\d{3})(\d{4})$/u;

/**
 * 🔴 D-W4-36.3: an office's phone as an appointment reads it — the prototype's «210 321 0101», the national form in
 * groups joined by no-break spaces so it never folds (the application's `formatPhoneDisplay` groups, without the
 * country). Only the digits survive what the server stored (U-65.6); a number from elsewhere stays whole, with its
 * «+». What is dialled is never this: `officeDialNumber` keeps the whole number. `undefined` without a digit.
 */
export function officePhoneLabel(phone: string | undefined): string | undefined {
	const digits = phone?.replace(/\D/gu, '') ?? '';
	if (!digits) return undefined;
	const greek = GREEK_NUMBER.exec(digits);
	if (greek) return greek.slice(1).join(NO_BREAK_SPACE);
	return phone?.trim().startsWith('+') ? `+${digits}` : digits;
}

/** An office's address in one of the languages it kept (D-06: frozen when the visit was booked). */
export type OfficeAddressTranslation = {
	language: string;
	street: string | null;
	streetNumber: string | null;
	city: string | null;
	state: string | null;
	floor: number | null;
};

/** An office's address parts and its floor, with the languages it kept (D-W51-37: the 51's and the 68's one shape). */
export type OfficeAddress = {
	street: string | null;
	streetNumber: string | null;
	city: string | null;
	state: string | null;
	/** `0` the ground floor, below it a basement: only a non-number is absence. */
	floor: number | null;
	translations: OfficeAddressTranslation[];
};

/**
 * The address parts in the page's language when the office had it then, else the ones it was booked with (D-W4-36.5).
 * Review w4-w3 R1 NIT-4: one or the other WHOLE — a translation without its street or its city is not taken, so a line
 * never reads half in each language («Ermou 101, Αθήνα»). The floor is a number of no language: the booked one stands
 * in for a translation that names none.
 */
export function officeAddressIn(office: OfficeAddress, locale: SupportedLocale) {
	const translated = office.translations.find(
		(entry) => entry.language === locale && entry.street && entry.city
	);
	const source = translated ?? office;
	const part = (value: string | null | undefined) => value ?? undefined;
	return {
		street: part(source.street),
		streetNumber: part(source.streetNumber),
		city: part(source.city),
		state: part(source.state),
		floor: source.floor ?? office.floor
	};
}

/** «Ερμού 101, Αθήνα, Αττική»: the street with its number, the city, the region — what is there, never an empty part. */
export function officeAddressJoin(parts: {
	street?: string;
	streetNumber?: string;
	city?: string;
	state?: string;
}): string {
	const street = [parts.street, parts.streetNumber].filter((part) => part?.trim()).join(' ');
	return [street, parts.city, parts.state].filter((part) => part?.trim()).join(', ');
}

/** «Ερμού 101, Αθήνα, Αττική» in the page's language (`officeAddressIn`); `''` without any part. */
export function officeAddressLine(office: OfficeAddress, locale: SupportedLocale): string {
	return officeAddressJoin(officeAddressIn(office, locale));
}

/**
 * 🔴 D-W4-34: the floor as an appointment writes it — «2ος όροφος», «Ισόγειο», «Υπόγειο» (the application's `floorLine`);
 * the words of the level are `officeFloorValue`'s (whose bare «2ος» the doctor's profile keeps). `null` without one.
 */
export function officeFloorLine(office: OfficeAddress, locale: SupportedLocale): string | null {
	const floor = officeAddressIn(office, locale).floor;
	const value = floor === null ? undefined : officeFloorValue(floor, locale);
	if (floor === null || !value) return null;
	return Math.trunc(floor) > 0 ? m.appointments_detail_floor({ floor: value }, { locale }) : value;
}

/** A phone as a page shows it and as `tel:` takes it (digits and one `+`). */
export type PhoneLine = { label: string; dial: string };

/**
 * An office's phone as read («210 321 0101», `officePhoneLabel`) and dialled whole («+302103210101»), `null` without a
 * dialable one (D-W4-36.3).
 */
export function officePhoneLine(stored: string | null | undefined): PhoneLine | null {
	const label = officePhoneLabel(stored ?? undefined);
	const dial = officeDialNumber(stored ?? undefined);
	return label && dial ? { label, dial } : null;
}

// A Greek number with its country (E.164 without the «+», as the server keeps a person's mobile), or a national one.
const GREEK_INTERNATIONAL = /^30(\d{3})(\d{3})(\d{4})$/u;
const GREEK_NATIONAL = /^([26]\d{2})(\d{3})(\d{4})$/u;

/**
 * 🔴 U-182.7 (screen 68): a person's mobile as the doctor reads it WHOLE — the prototype's «+30 697 765 4321», groups
 * joined by no-break spaces — and dialled with its country («+306977654321»). The server keeps it without the «+» (its
 * E.164 digits); only digits survive (U-65.6). `null` without a digit.
 */
export function mobilePhoneLine(stored: string | null | undefined): PhoneLine | null {
	const digits = stored?.replace(/\D/gu, '') ?? '';
	if (!digits) return null;
	const greek = GREEK_INTERNATIONAL.exec(digits) ?? GREEK_NATIONAL.exec(digits);
	if (greek) {
		return {
			label: ['+30', ...greek.slice(1)].join(NO_BREAK_SPACE),
			dial: `+30${greek.slice(1).join('')}`
		};
	}
	return { label: `+${digits}`, dial: `+${digits}` };
}

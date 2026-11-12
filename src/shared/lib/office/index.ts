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

import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { zonedDay } from '$shared/lib/format';
import {
	DOCTOR_ONBOARDING_ADDRESS_QUERY_MAX_LENGTH,
	DOCTOR_ONBOARDING_ADDRESS_QUERY_MIN_LENGTH,
	DOCTOR_ONBOARDING_CITY_MAX_LENGTH,
	DOCTOR_ONBOARDING_EMAIL_CODE_LENGTH,
	DOCTOR_ONBOARDING_EMAIL_MAX_LENGTH,
	DOCTOR_ONBOARDING_GETTING_THERE_MAX_LENGTH,
	DOCTOR_ONBOARDING_LIABILITY_COMPANY_MAX_LENGTH,
	DOCTOR_ONBOARDING_LICENSE_NUMBER_MAX_LENGTH,
	DOCTOR_ONBOARDING_MIN_AGE_YEARS,
	DOCTOR_ONBOARDING_NAME_MAX_LENGTH,
	DOCTOR_ONBOARDING_POSTAL_CODE_MAX_LENGTH,
	DOCTOR_ONBOARDING_PRICE_DIGITS,
	DOCTOR_ONBOARDING_PRICE_MAX,
	DOCTOR_ONBOARDING_SPECIALTY_SEARCH_MAX_LENGTH,
	DOCTOR_ONBOARDING_STREET_LINE_MAX_LENGTH
} from '$modules/doctor-onboarding/config';

/**
 * 🔴 U-65.6: the sign-up's rules on the page, the application's `lib/validation` one to one (`how-we-work.md` §4: one
 * rule in both), each the copy of the server's limit — a field never accepts what the write would refuse. The server
 * stays the judge of every one.
 */

const NUL = '\u0000';
const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/u;
/** The oldest a date of birth may be (the server's rule of a person's date of birth). */
const MAX_AGE_YEARS = 120;

/** Text the server would keep: something besides blanks, within `max`, and no NUL (PostgreSQL refuses it). */
function isBoundedText(value: string, max: number): boolean {
	const trimmed = value.trim();
	return trimmed.length > 0 && trimmed.length <= max && !trimmed.includes(NUL);
}

/** A first or last name as the server takes it (1…100). */
export function isValidDoctorName(value: string): boolean {
	return isBoundedText(value, DOCTOR_ONBOARDING_NAME_MAX_LENGTH);
}

/** `[year, month, day]` of a real calendar day `YYYY-MM-DD`, or `null` (`2026-02-31` is none). */
function dayParts(day: string): [number, number, number] | null {
	const match = CALENDAR_DAY.exec(day);
	if (!match) return null;
	const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const parsed = new Date(Date.UTC(year, month - 1, date));
	return parsed.getUTCFullYear() === year &&
		parsed.getUTCMonth() === month - 1 &&
		parsed.getUTCDate() === date
		? [year, month, date]
		: null;
}

/** Whole years from `born` to `today` (both `[y, m, d]`): a birthday not yet reached this year counts one less. */
function yearsBetween(born: [number, number, number], today: [number, number, number]): number {
	const reached = today[1] > born[1] || (today[1] === born[1] && today[2] >= born[2]);
	return today[0] - born[0] - (reached ? 0 : 1);
}

/**
 * Record §6.4 «τουλάχιστον 18 ετών», on the platform's calendar (Athens): a real day, not after today, not beyond 120
 * years, and the 18th birthday reached today or before (born today 18 years ago: yes; tomorrow: not yet).
 */
export function isDoctorOfAge(dateOfBirth: string, now: number): boolean {
	const born = dayParts(dateOfBirth);
	const today = dayParts(zonedDay(now, PLATFORM_TIME_ZONE));
	if (!born || !today) return false;
	const years = yearsBetween(born, today);
	return years >= DOCTOR_ONBOARDING_MIN_AGE_YEARS && years <= MAX_AGE_YEARS;
}

/** One address with an `@`, a dot in its domain and no blank (the prototype's rule), within 254. */
export function isValidContactEmail(value: string): boolean {
	const trimmed = value.trim();
	return (
		trimmed.length <= DOCTOR_ONBOARDING_EMAIL_MAX_LENGTH &&
		/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(trimmed)
	);
}

/** The six digits of the email's code, nothing else. */
export function isValidEmailCode(value: string): boolean {
	return value.length === DOCTOR_ONBOARDING_EMAIL_CODE_LENGTH && /^\d+$/u.test(value);
}

/** An optional license number: empty, or within 50 with no NUL. */
export function isValidLicenseNumber(value: string): boolean {
	return value.trim() === '' || isBoundedText(value, DOCTOR_ONBOARDING_LICENSE_NUMBER_MAX_LENGTH);
}

/** An optional license date: empty, or a real day that is not after today (Athens). */
export function isValidLicenseDate(value: string, now: number): boolean {
	if (value === '') return true;
	const day = dayParts(value);
	return day !== null && value <= zonedDay(now, PLATFORM_TIME_ZONE);
}

/** «Οδός και αριθμός» in one line (D-W3-04, the server splits it): 1…200. */
export function isValidStreetLine(value: string): boolean {
	return isBoundedText(value, DOCTOR_ONBOARDING_STREET_LINE_MAX_LENGTH);
}

/** «Πόλη ή περιοχή»: 1…200. */
export function isValidCity(value: string): boolean {
	return isBoundedText(value, DOCTOR_ONBOARDING_CITY_MAX_LENGTH);
}

/** A Greek postal code: five digits, a space after the third allowed («185 32» or «18532», §5.2). */
export function isValidPostalCode(value: string): boolean {
	return /^\d{3} ?\d{2}$/u.test(value.trim());
}

/** What the postal code field keeps of a keystroke: digits and spaces only, six characters at most. */
export function keepPostalCodeInput(value: string): string {
	return value.replace(/[^\d ]/gu, '').slice(0, DOCTOR_ONBOARDING_POSTAL_CODE_MAX_LENGTH);
}

/** A Greek postal code as people write it, «185 32»; anything that is not five digits stays as it is. */
export function formatPostalCode(value: string): string {
	const digits = value.replace(/\s/gu, '');
	return /^\d{5}$/u.test(digits) ? `${digits.slice(0, 3)} ${digits.slice(3)}` : value;
}

/** What the address search sends: the typed words, cut at 120 (the server refuses more). */
export function readAddressQuery(value: string): string {
	return value.slice(0, DOCTOR_ONBOARDING_ADDRESS_QUERY_MAX_LENGTH);
}

/** Whether the typed words are enough to ask: two letters after the blanks are trimmed. */
export function isSearchableAddressQuery(value: string): boolean {
	return value.trim().length >= DOCTOR_ONBOARDING_ADDRESS_QUERY_MIN_LENGTH;
}

/** What the specialty list's search keeps: the typed words, cut at 60. */
export function readSpecialtyQuery(value: string): string {
	return value.slice(0, DOCTOR_ONBOARDING_SPECIALTY_SEARCH_MAX_LENGTH);
}

/** An office or contact phone (the prototype's rule, the application's): 10 to 16 digits and spaces, an optional `+`. */
export function isValidPhone(value: string): boolean {
	return /^\+?[0-9 ]{10,16}$/u.test(value.trim());
}

/** The directions to the office as they are kept and sent: cut at 1000 (U-68.2), whatever a paste brought. */
export function readGettingThere(value: string): string {
	return value.slice(0, DOCTOR_ONBOARDING_GETTING_THERE_MAX_LENGTH);
}

/** The visit's price: digits only, 1 to 9999 (record §6.4, the server's maximum). */
export function isValidPrice(value: string): boolean {
	return (
		/^\d{1,4}$/u.test(value) && Number(value) >= 1 && Number(value) <= DOCTOR_ONBOARDING_PRICE_MAX
	);
}

/** What the price field keeps of a keystroke: digits only, four at most (no sign, no decimal, record §6.4). */
export function keepPriceInput(value: string): string {
	return value.replace(/\D/gu, '').slice(0, DOCTOR_ONBOARDING_PRICE_DIGITS);
}

/** The optional insurance company: blank, or within 120 with no NUL (the server's short text). */
export function isValidLiabilityCompany(value: string): boolean {
	return (
		value.trim() === '' || isBoundedText(value, DOCTOR_ONBOARDING_LIABILITY_COMPANY_MAX_LENGTH)
	);
}

/** An optional policy expiry: empty, or a real calendar day — the past and the future alike (a policy may lapse). */
export function isValidPolicyExpiry(value: string): boolean {
	return value === '' || dayParts(value) !== null;
}

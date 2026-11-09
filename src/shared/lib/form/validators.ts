/**
 * Synchronous field validators, ported from the legacy Vue `FormControl`
 * validators. A validator returns `null` when valid, or `{ <key>: true }`
 * describing the failure; `createForm` maps the first failing key to a message.
 */
export type ValidatorError = Record<string, true> | null;
export type ValidatorFn = (value: unknown) => ValidatorError;

/** Run every validator and merge their errors (null when all pass). */
export function runValidators(value: unknown, validators: ValidatorFn[]): ValidatorError {
	let errors: Record<string, true> = {};
	for (const validator of validators) {
		const error = validator(value);
		if (error) errors = { ...errors, ...error };
	}
	return Object.keys(errors).length ? errors : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// One uppercase, one lowercase, one digit or symbol.
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[\d\W]).+$/;

/**
 * 🔴 U-121.2 · one word of Latin or Greek letters (monotonic and polytonic): no space, hyphen, apostrophe or digit.
 * The server's `onlyCharactersSchema`, character for character (`tests/architecture/server-rules.test.ts`).
 */
export const LETTERS_ONLY_PATTERN = /^[a-zA-Z\u0370-\u03FF\u1F00-\u1FFF]+$/;

/** 🔴 U-121.3 · the ONE length of each Greek id (the server's `AMKA_REGEX` / `AFM_REGEX`, `server-rules.test.ts`). */
export const AMKA_LENGTH = 11;
export const AFM_LENGTH = 9;

/**
 * W9 Delta 1 (NIT-2) · a Greek id as the server reads it (`GreekIdPolicy.normalizeOptionalDigits`): its digits 0–9
 * alone, every space, dash, letter or other script's digit dropped; `''` for nothing.
 */
export function greekIdDigits(value: unknown): string {
	return String(value ?? '')
		.trim()
		.replace(/[^0-9]/g, '');
}

// The ΑΜΚΑ carries no year, so February may have 29 (the server's `GreekIdPolicy`).
const MAX_DAYS_BY_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * 🔴 U-121.3 · the server's `GreekIdPolicy`: an ΑΜΚΑ starts with a day and a month that exist (DDMM), an ΑΦΜ ends
 * with the check digit of its first eight (weights 2⁸…2¹, the sum mod 11, then mod 10).
 */
function hasAmkaDate(amka: string): boolean {
	const day = Number(amka.slice(0, 2));
	const month = Number(amka.slice(2, 4));
	return month >= 1 && month <= 12 && day >= 1 && day <= MAX_DAYS_BY_MONTH[month - 1];
}

function hasAfmCheckDigit(afm: string): boolean {
	const sum = [...afm.slice(0, 8)].reduce(
		(total, digit, index) => total + Number(digit) * 2 ** (8 - index),
		0
	);
	return (sum % 11) % 10 === Number(afm[8]);
}

function isEmptyValue(value: unknown): boolean {
	if (value == null) return true;
	if (typeof value === 'string') return value.trim().length === 0;
	if (Array.isArray(value)) return value.length === 0;
	return false;
}

export const Validators = {
	required(value: unknown): ValidatorError {
		return isEmptyValue(value) ? { required: true } : null;
	},
	minLength(min: number): ValidatorFn {
		return (value) => (String(value ?? '').length >= min ? null : { minLength: true });
	},
	maxLength(max: number): ValidatorFn {
		return (value) => (String(value ?? '').length <= max ? null : { maxLength: true });
	},
	min(minValue: number): ValidatorFn {
		return (value) => (Number(value) >= minValue ? null : { min: true });
	},
	max(maxValue: number): ValidatorFn {
		return (value) => (Number(value) <= maxValue ? null : { max: true });
	},
	email(value: unknown): ValidatorError {
		if (isEmptyValue(value)) return null;
		return EMAIL_RE.test(String(value)) ? null : { email: true };
	},
	passwordStrength(value: unknown): ValidatorError {
		if (isEmptyValue(value)) return null;
		return PASSWORD_RE.test(String(value)) ? null : { passwordStrength: true };
	},
	pattern(regex: RegExp, key = 'pattern'): ValidatorFn {
		return (value) => {
			if (isEmptyValue(value)) return null;
			return regex.test(String(value)) ? null : { [key]: true };
		};
	},
	/** One word of letters once trimmed (`LETTERS_ONLY_PATTERN`); an empty value is `required`'s. */
	lettersOnly(value: unknown): ValidatorError {
		if (isEmptyValue(value)) return null;
		return LETTERS_ONLY_PATTERN.test(String(value).trim()) ? null : { lettersOnly: true };
	},
	/**
	 * An ΑΜΚΑ whose digits (`greekIdDigits`, as the server keeps them) are 11 but start with no real day and month. Its
	 * length stays the caller's `pattern`, asked first over a field that keeps only digits.
	 */
	amkaDate(value: unknown): ValidatorError {
		const amka = greekIdDigits(value);
		if (amka.length !== AMKA_LENGTH) return null;
		return hasAmkaDate(amka) ? null : { amkaDate: true };
	},
	/**
	 * An ΑΦΜ whose digits (`greekIdDigits`) are 9 but end with no check digit of the first eight. Its length stays the
	 * caller's `pattern`, as above.
	 */
	afmCheckDigit(value: unknown): ValidatorError {
		const afm = greekIdDigits(value);
		if (afm.length !== AFM_LENGTH) return null;
		return hasAfmCheckDigit(afm) ? null : { afmCheckDigit: true };
	}
};

/** Default human messages per error key; override per-field in `createForm`. */
export const defaultMessages: Record<string, string> = {
	required: 'This field is required',
	email: 'Enter a valid email address',
	minLength: 'Too short',
	maxLength: 'Too long',
	min: 'Value is too small',
	max: 'Value is too large',
	passwordStrength: 'Use upper, lower and a number or symbol',
	pattern: 'Invalid format',
	lettersOnly: 'Use letters only',
	amkaDate: 'Invalid AMKA',
	afmCheckDigit: 'Invalid tax number'
};

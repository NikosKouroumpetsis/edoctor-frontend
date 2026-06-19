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
	pattern: 'Invalid format'
};

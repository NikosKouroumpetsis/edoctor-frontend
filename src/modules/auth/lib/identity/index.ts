import { authPasswordMinimumLength } from '$modules/auth/config/sign-in';
import type { AuthGender, AuthIdentitySubmission, AuthIdentityValues } from '$modules/auth/types';

export const emptyIdentityValues: AuthIdentityValues = {
	firstName: '',
	lastName: '',
	birthDate: '',
	gender: ''
};

// One uppercase, one lowercase, one digit or symbol (`PASSWORD_RE` of the application's validators, the same rule).
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[\d\W]).+$/;

export type PasswordProblem = 'too-short' | 'too-weak';

/** A new password's rule: at least 8, with upper case, lower case and a digit or symbol. */
export function readPasswordProblem(password: string): PasswordProblem | null {
	if (password.length < authPasswordMinimumLength) return 'too-short';
	return PASSWORD_RE.test(password) ? null : 'too-weak';
}

export type IdentityProblems = { firstName?: true; lastName?: true; birthDate?: true };

/** What the shared details miss; gender is optional, the contract accepts a profile without it. */
export function readIdentityProblems(values: AuthIdentityValues): IdentityProblems {
	return {
		...(values.firstName.trim() ? {} : { firstName: true }),
		...(values.lastName.trim() ? {} : { lastName: true }),
		...(values.birthDate ? {} : { birthDate: true })
	};
}

const genderWire: Record<AuthGender, NonNullable<AuthIdentitySubmission['gender']>> = {
	MALE: 'MALE',
	FEMALE: 'FEMALE',
	OTHER: 'OTHER_GENE'
};

/** The details in the shape both write contracts accept: the day as an instant, no empty gender. */
export function toIdentitySubmission(values: AuthIdentityValues): AuthIdentitySubmission {
	return {
		dateOfBirth: new Date(`${values.birthDate}T00:00:00.000Z`).toISOString(),
		firstName: values.firstName.trim(),
		lastName: values.lastName.trim(),
		...(values.gender ? { gender: genderWire[values.gender] } : {})
	};
}

/** The days of a month, for the date picker (`month` 1–12). */
export function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** `YYYY-MM-DD` of the three pickers, the day capped to its month. */
export function composeBirthDate(year: number, month: number, day: number): string {
	const safeDay = Math.min(day, daysInMonth(year, month));
	return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

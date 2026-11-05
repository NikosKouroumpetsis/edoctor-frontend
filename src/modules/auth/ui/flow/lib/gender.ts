import type { AuthGender } from '$modules/auth/types';

const genders: readonly AuthGender[] = ['MALE', 'FEMALE', 'OTHER'];

/** The list speaks plain strings, so its answer is narrowed back before it is kept. */
export function toAuthGender(value: string): AuthGender | '' {
	return genders.find((gender) => gender === value) ?? '';
}

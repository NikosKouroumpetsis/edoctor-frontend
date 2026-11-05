import type { AuthChannel, AuthIdentifier } from '$modules/auth/types';

const MASK = '***';
const VISIBLE_PHONE_DIGITS = 3;

/** `kouros@gmail.com` ⇒ `k***s@gmail.com`; a value with no local part stays as it is (the application's `maskEmail`). */
export function maskEmail(email: string): string {
	const separator = email.lastIndexOf('@');
	if (separator <= 0) return email;
	const local = email.slice(0, separator);
	const tail = local.length > 2 ? local[local.length - 1] : '';
	return `${local[0]}${MASK}${tail}${email.slice(separator)}`;
}

/** `+306971234567` ⇒ `***567` (the application's `maskPhone`). */
export function maskPhone(mobilePhone: string): string {
	const digits = mobilePhone.replace(/\D/gu, '');
	return digits.length <= VISIBLE_PHONE_DIGITS
		? mobilePhone
		: `${MASK}${digits.slice(-VISIBLE_PHONE_DIGITS)}`;
}

export function maskIdentifier(identifier: AuthIdentifier): string {
	return 'email' in identifier ? maskEmail(identifier.email) : maskPhone(identifier.mobilePhone);
}

export function channelOf(identifier: AuthIdentifier): AuthChannel {
	return 'email' in identifier ? 'email' : 'phone';
}

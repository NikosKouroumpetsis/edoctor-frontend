import type { AccountGender, AccountLocale, AccountLocaleFacts, AccountPersonFacts } from './types';

const LOCALES: readonly string[] = ['el', 'en'] satisfies AccountLocale[];

/**
 * 🔴 U-169 / U-65.6: of the whole answer of `GET /user/me` only its `locale` is kept, and only when it is one of the
 * contract's two — no profile yet (`null`), another word, a number or a list read as none, never a throw.
 */
export function mapAccountLocale(view: unknown): AccountLocaleFacts {
	const locale =
		typeof view === 'object' && view !== null && !Array.isArray(view)
			? (view as { locale?: unknown }).locale
			: null;
	return {
		locale:
			typeof locale === 'string' && LOCALES.includes(locale) ? (locale as AccountLocale) : null
	};
}

const GENDERS: readonly string[] = [
	'FEMALE',
	'MALE',
	'NON_BINARY',
	'OTHER_GENE'
] satisfies AccountGender[];
// The day of an instant the server keeps (`1988-03-14T00:00:00.000Z`): its first ten characters, when they are a date.
const DAY = /^\d{4}-\d{2}-\d{2}(?=$|T)/u;

/**
 * 🔴 U-169 / U-65.6 (screen 58): of the whole answer of `GET /user/me` only the gender — when it is one of the contract's
 * four — and the day of birth are kept; no profile yet (`null`), another word or another type read as none, never a throw.
 */
export function mapAccountPerson(view: unknown): AccountPersonFacts {
	const profile =
		typeof view === 'object' && view !== null && !Array.isArray(view)
			? (view as { gender?: unknown; dateOfBirth?: unknown })
			: {};
	const { gender, dateOfBirth } = profile;
	const day = typeof dateOfBirth === 'string' ? DAY.exec(dateOfBirth)?.[0] : undefined;
	return {
		gender:
			typeof gender === 'string' && GENDERS.includes(gender) ? (gender as AccountGender) : null,
		birthDate: day ?? null
	};
}

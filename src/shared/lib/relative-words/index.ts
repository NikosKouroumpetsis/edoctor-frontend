import { m } from '$paraglide/messages.js';
import type { ApiRequestBody } from '$shared/lib/api-client';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/*
 * 🔴 U-139.5 · D-W4-22: the ONE helper of a relationship's word on the web. Shared since wave 5.1 (card w51-w2, D-W51-27):
 * the patient's pages and the doctor's «Σήμερα» say the relationships the same way, and a module never imports another.
 */

/** The relationships and genders the server takes (the relative's body's enums, never a list of ours). */
type BookingRelativeRelationship = Required<ApiRequestBody<'addPatientRelative'>>['relationship'];
type BookingRelativeGender = Required<ApiRequestBody<'addPatientRelative'>>['gender'];

type Message = (inputs: Record<string, never>, options: { locale: SupportedLocale }) => string;

/** Every relationship the contract knows, in its neutral word («Παιδί», «Γονέας» …), total over the union. */
const RELATIONSHIP_WORDS = {
	CHILD: m.relatives_relationship_child,
	OTHER_RELE: m.relatives_relationship_other,
	PARENT: m.relatives_relationship_parent,
	SIBLING: m.relatives_relationship_sibling,
	SPOUSE: m.relatives_relationship_spouse
} as const satisfies Record<BookingRelativeRelationship, Message>;

/** U-139.5: the relationships whose word follows the gender; `SPOUSE` and `OTHER_RELE` have one word. */
const GENDERED_WORDS = {
	CHILD: { FEMALE: m.relatives_word_daughter, MALE: m.relatives_word_son },
	PARENT: { FEMALE: m.relatives_word_mother, MALE: m.relatives_word_father },
	SIBLING: { FEMALE: m.relatives_word_sister, MALE: m.relatives_word_brother }
} as const satisfies Partial<
	Record<BookingRelativeRelationship, Record<'FEMALE' | 'MALE', Message>>
>;

/** U-139.5: the article before the name; any other gender reads the neutral «Ο/Η» (English: the name alone). */
const SUBJECTS = {
	FEMALE: m.relatives_subject_female,
	MALE: m.relatives_subject_male
} as const satisfies Partial<
	Record<
		BookingRelativeGender,
		(inputs: { name: string }, options: { locale: SupportedLocale }) => string
	>
>;

/**
 * 🔴 U-139.5 · D-W4-22 (the ONE helper of the web, the application's `relativeWordLabel`): the word of a relationship by
 * the relative's gender — «Γιος» / «Κόρη», «Πατέρας» / «Μητέρα», «Αδελφός» / «Αδελφή», «Σύζυγος»; a gender with no word
 * of its own (`NON_BINARY`, `OTHER_GENE`, `''`, unknown) reads the neutral word. A relationship this build cannot name
 * (`''` on an old snapshot, a newer value) reads `''`, never the stored value. Wire strings in: snapshots fit too.
 */
export function relativeWordLabel(
	relationship: string,
	gender: string | null | undefined,
	locale: SupportedLocale
): string {
	if (!Object.hasOwn(RELATIONSHIP_WORDS, relationship)) return '';
	const known = relationship as BookingRelativeRelationship;
	const gendered = Object.hasOwn(GENDERED_WORDS, known)
		? GENDERED_WORDS[known as keyof typeof GENDERED_WORDS]
		: null;
	const word =
		gendered && gender && Object.hasOwn(gendered, gender)
			? gendered[gender as 'FEMALE' | 'MALE']
			: RELATIONSHIP_WORDS[known];
	return word({}, { locale });
}

/** U-139.5: «Ο Γιώργος Παππάς» / «Η Άννα Παππά» / «Ο/Η …» for any other gender (the English reads the name alone). */
export function relativeSubject(
	name: string,
	gender: string | null | undefined,
	locale: SupportedLocale
): string {
	const subject =
		gender && Object.hasOwn(SUBJECTS, gender)
			? SUBJECTS[gender as keyof typeof SUBJECTS]
			: m.relatives_subject_neutral;
	return subject({ name }, { locale });
}

/**
 * U-139.5: a visitor named with their word after the name, its first letter small — «Γιώργος Παππάς (γιος)»; the name
 * alone when the relationship has no word in this build, `''` without a name (each caller has its own fallback).
 */
export function relativeNameWithWord(
	name: string,
	relationship: string,
	gender: string | null | undefined,
	locale: SupportedLocale
): string {
	const word = relativeWordLabel(relationship, gender, locale);
	if (!name || !word) return name;
	return m.relatives_name_with_word(
		{ name, word: word.charAt(0).toLocaleLowerCase(locale) + word.slice(1) },
		{ locale }
	);
}

/** The relationship seen from the other side: the child's booker is a parent, a sibling's a sibling. */
const BOOKER_RELATIONSHIPS = {
	CHILD: 'PARENT',
	OTHER_RELE: 'OTHER_RELE',
	PARENT: 'CHILD',
	SIBLING: 'SIBLING',
	SPOUSE: 'SPOUSE'
} as const satisfies Record<BookingRelativeRelationship, BookingRelativeRelationship>;

/**
 * 🔴 Screen 66 «Το έκλεισε: Ελένη Μαυρίδη (γονέας)» (D-W51-27): the word of the account holder who booked for a relative,
 * read from the relative's relationship turned around, in its neutral word (the holder's gender is never on the wire),
 * its first letter small; `''` for a relationship this build cannot name.
 */
export function bookerWordLabel(relationship: string, locale: SupportedLocale): string {
	if (!Object.hasOwn(BOOKER_RELATIONSHIPS, relationship)) return '';
	const word = relativeWordLabel(
		BOOKER_RELATIONSHIPS[relationship as BookingRelativeRelationship],
		null,
		locale
	);
	return word.charAt(0).toLocaleLowerCase(locale) + word.slice(1);
}

const GENDER_WORDS = {
	FEMALE: m.relatives_gender_female,
	MALE: m.relatives_gender_male,
	NON_BINARY: m.relatives_gender_non_binary,
	OTHER_GENE: m.relatives_gender_other
} as const satisfies Record<BookingRelativeGender, Message>;

/** Screen 68's «Φύλο»: a relative's gender as spelled by the server in words; `''` for a value this build cannot name. */
export function relativeGenderLabel(gender: string, locale: SupportedLocale): string {
	return Object.hasOwn(GENDER_WORDS, gender)
		? GENDER_WORDS[gender as BookingRelativeGender]({}, { locale })
		: '';
}

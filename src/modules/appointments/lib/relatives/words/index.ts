import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	BookingRelativeGender,
	BookingRelativeRelationship
} from '$modules/appointments/api/relatives';

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

import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { RelativeFacts } from '$modules/appointments/api/relatives';
import { PATIENT_RELATIVES_MAX } from '$modules/appointments/config';
import { relativeSubject, relativeWordLabel } from '$modules/appointments/lib/relatives/words';

/** One row of «Οι συγγενείς μου» (record §11.2): the initial in its circle, the name, the word of the relationship. */
export type RelativeRow = { relativeId: string; initial: string; name: string; word: string };

/**
 * Screen 55's rows, in the server's order: «Γιώργος Παππάς · Γιος», «Άννα Παππά · Μητέρα» (U-139.5: the word from the
 * relationship and the gender; none for a relationship this build cannot name). The initial is the first letter of the
 * first name as written (`rel.js:65`), never a guess.
 */
export function buildRelativeRows(
	relatives: readonly Pick<
		RelativeFacts,
		'relativeId' | 'firstName' | 'lastName' | 'relationship' | 'gender'
	>[],
	locale: SupportedLocale
): RelativeRow[] {
	return relatives.map((relative) => ({
		relativeId: relative.relativeId,
		initial: Array.from(relative.firstName.trim())[0] ?? '',
		name: `${relative.firstName} ${relative.lastName}`.trim(),
		word: relativeWordLabel(relative.relationship, relative.gender, locale)
	}));
}

/** Record §11.2: «Προσθήκη συγγενή» sleeps at the 20 a person may keep (the server's `PATIENT_RELATIVES_MAX`). */
export function relativesAtLimit(count: number): boolean {
	return count >= PATIENT_RELATIVES_MAX;
}

/**
 * What the list says right after a write (record §11.2, D-W4-33): who was added or deleted with the article of their
 * gender (U-139.5), the changes saved — or (P-W4 §4.6) a relative the server no longer keeps for the person.
 */
export type RelativesDone =
	| { kind: 'added' | 'deleted'; name: string; gender: string }
	| { kind: 'saved' }
	| { kind: 'gone' };

/** The notice's sentence: «Η Μαρία Παππά προστέθηκε.», «Οι αλλαγές αποθηκεύτηκαν.», «Ο Γιώργος Παππάς διαγράφηκε.». */
export function relativesDoneText(done: RelativesDone, locale: SupportedLocale): string {
	const options = { locale };
	switch (done.kind) {
		case 'added':
			return m.relatives_done_added(
				{ subject: relativeSubject(done.name, done.gender, locale) },
				options
			);
		case 'deleted':
			return m.relatives_done_deleted(
				{ subject: relativeSubject(done.name, done.gender, locale) },
				options
			);
		case 'saved':
			return m.relatives_done_saved({}, options);
		default:
			return m.relatives_failure_forbidden({}, options);
	}
}

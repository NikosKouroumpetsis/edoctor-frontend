/**
 * Case- and accent-insensitive fold for search matching and highlighting, the application's `foldSearchText`
 * (same rules): NFD with the combining marks stripped (Greek tonos and dialytika, Latin accents), lowercase in
 * the Greek locale, and the final sigma `ς` folded to `σ`. Pure; it does not trim.
 */
export function foldSearchText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036F]/g, '')
		.toLocaleLowerCase('el')
		.replace(/ς/g, 'σ');
}

/** A Greek letter carrying the acute, possibly behind other combining marks such as dialytika. */
const GREEK_LETTER_WITH_ACUTE = /([Ͱ-Ͽ])([̀-ͯ]*)́/gu;

const GREEK_LETTER = /[Ͱ-Ͽ]/u;

/**
 * 🔴 Uppercase for DISPLAY, the Greek way: «ΠΡΟΣΘΗΚΗ», never «ΠΡΟΣΘΉΚΗ» (the application's
 * `toGreekUpperCase`, same rules). The dialytika are a reading mark and stay; `ΐ`/`ΰ` leave their acute
 * behind as a combining mark, so the string is decomposed. Text with no Greek in it is returned as is:
 * the `uppercase` class already draws it, and another alphabet's spelling is not ours to change.
 */
export function toGreekUpperCase(value: string): string {
	if (!GREEK_LETTER.test(value)) return value;

	return value
		.toUpperCase()
		.normalize('NFD')
		.replace(GREEK_LETTER_WITH_ACUTE, '$1$2')
		.normalize('NFC');
}

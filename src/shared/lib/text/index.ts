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

const DOCTOR_TITLE = /^(?:dr|δρ)(?:\.|\s)/iu;

/**
 * 🔴 U-99.1: a doctor's name inside a sentence, «Dr. Σοφία Ρηγοπούλου», in both languages. A name that already wears its
 * title («Dr.», «Δρ.») keeps only that one; no name stays no name. The caller knows it is a doctor's: never guess it here.
 */
export function withDoctorTitle(name: string): string {
	const known = name.trim();
	return !known || DOCTOR_TITLE.test(known) ? known : `Dr. ${known}`;
}

/** How many characters a text has as a person and the server count them (code points: an emoji is one, 🩺 not two). */
export function countCodePoints(value: string): number {
	return [...value].length;
}

/**
 * 🔴 D-W4-36.8: a text cut to a bound the server counts in UTF-16 code units (its Joi `.max`, `value.length`; the
 * application's `.slice`), so the page never sends what the server refuses — but never through the middle of an emoji:
 * a pair the bound would split leaves whole. A text within the bound is returned as it is.
 */
export function clampTextLength(value: string, max: number): string {
	if (value.length <= max) return value;
	const cut = value.slice(0, Math.max(0, max));
	const last = cut.charCodeAt(cut.length - 1);
	return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

/** The folded words of a search (`foldSearchText`, split on white space, empty ones dropped). */
export function searchWords(query: string | null | undefined): string[] {
	return foldSearchText(query ?? '')
		.split(/\s+/u)
		.filter(Boolean);
}

/** Whether every word of a search is somewhere in `text` (folded, anywhere inside a word). */
export function matchesSearch(text: string, words: readonly string[]): boolean {
	const folded = foldSearchText(text);
	return words.every((word) => folded.includes(word));
}

/** One run of a highlighted text: its words and whether they matched the search. */
export type HighlightRun = { text: string; match: boolean };

/**
 * U-57.3 / U-60.1 (the prototypes' `hl`): `text` cut into runs, the parts that match a word of the search marked —
 * anywhere inside a word, ignoring case and accents. Each character is folded on its own, so a place found in the
 * folded text is the same place in the text (a letter never folds into two).
 */
export function highlightSearch(text: string, words: readonly string[]): HighlightRun[] {
	const chars = Array.from(text);
	const folded = chars.map((char) => foldSearchText(char).charAt(0) || char).join('');
	const marked = chars.map(() => false);
	for (const word of words) {
		if (!word) continue;
		for (let at = folded.indexOf(word); at >= 0; at = folded.indexOf(word, at + word.length)) {
			for (let index = at; index < at + word.length; index += 1) marked[index] = true;
		}
	}
	const runs: HighlightRun[] = [];
	chars.forEach((char, index) => {
		const last = runs.at(-1);
		if (last && last.match === marked[index]) last.text += char;
		else runs.push({ text: char, match: marked[index] });
	});
	return runs;
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

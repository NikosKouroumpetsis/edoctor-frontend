import { m } from '$paraglide/messages.js';
import { matchesSearch, searchWords } from '$shared/lib/text';
import type {
	DoctorLanguageFacts,
	DoctorLanguageOptionFacts,
	DoctorLanguagesFailure
} from '$modules/doctor-dashboard/api/languages';
import {
	DOCTOR_SPEAK_LANGUAGE_GREEK_CODE,
	DOCTOR_SPEAK_LANGUAGE_LIMIT
} from '$modules/doctor-dashboard/config';

type Locale = 'el' | 'en';

/**
 * 🔴 D-W52-69 (`64-switch/sw.js` `slOrder`): Greek first, then by name as the page's own language orders letters
 * (`Intl.Collator`) — the catalogue comes in the order of its codes, the doctor's languages in the server's.
 */
export function sortDoctorLanguages<Language extends DoctorLanguageFacts>(
	languages: readonly Language[],
	locale: Locale
): Language[] {
	const collator = new Intl.Collator(locale);
	const first = (language: Language) =>
		language.code === DOCTOR_SPEAK_LANGUAGE_GREEK_CODE ? 0 : 1;
	return [...languages].sort(
		(one, other) => first(one) - first(other) || collator.compare(one.name, other.name)
	);
}

/**
 * 🔴 D-W52-69: the words typed in the search as the catalogue's `normalized` is read — lower case, without accents, a
 * final «ς» as «σ» (folded on both sides, so a word typed with either is found); `[]` for no words.
 */
export function doctorLanguageSearchWords(query: string): string[] {
	return searchWords(query);
}

/**
 * 🔴 D-W52-69 (`sw.js` `slPickPage`): whether a language answers the search — every word typed is somewhere INSIDE its
 * `normalized` name («γα» finds «Γαλλικά» and «Βουλγαρικά»), whatever the accents. No words ⇒ every language.
 */
export function doctorLanguageMatches(
	language: DoctorLanguageOptionFacts,
	words: readonly string[]
): boolean {
	return matchesSearch(language.normalized, words);
}

/** One row of the choice: the catalogue's line and whether it can be pressed. */
export type DoctorLanguageRow = { value: string; label: string; disabled: boolean };

/**
 * What the page of the choice draws. Without words in the search (`lists`): «Οι γλώσσες σας» over «Όλες οι γλώσσες».
 * With words (`search`): ONE list without a heading, and — when it finds no language — the words that say so.
 */
export type DoctorLanguagePick =
	| { kind: 'lists'; yours: DoctorLanguageRow[]; all: DoctorLanguageRow[] }
	| { kind: 'search'; found: DoctorLanguageRow[]; none: string | null };

/**
 * 🔴 D-W52-69 / 69α · U-112 (`sw.js` `slPickPage`, `82-langs/shots/m-find.png`): the catalogue as rows with ticks.
 * - No words: «Οι γλώσσες σας» — the languages of `top`, the doctor's own as the page opened — Greek first, then by
 *   name; they KEEP their place while the page is open, ticked or not. Under them «Όλες οι γλώσσες»: every other one.
 * - Words: ONE list — every language of the catalogue that answers them, the chosen ones with their tick among them,
 *   Greek first, then by name. A chosen language the words do not find is not in it (D-W52-69α).
 * - At the limit every row that is not chosen goes out (it can be chosen again once one is taken out).
 * - `none`: «Καμία γλώσσα με «…».» when the words find NO language.
 */
export function buildDoctorLanguagePick(input: {
	catalogue: readonly DoctorLanguageOptionFacts[];
	top: readonly string[];
	chosen: readonly string[];
	query: string;
	locale: Locale;
}): DoctorLanguagePick {
	const { catalogue, top, chosen, query, locale } = input;
	const words = doctorLanguageSearchWords(query);
	const full = chosen.length >= DOCTOR_SPEAK_LANGUAGE_LIMIT;
	const row = ({ code, name }: DoctorLanguageOptionFacts): DoctorLanguageRow => ({
		value: code,
		label: name,
		disabled: full && !chosen.includes(code)
	});
	const sorted = sortDoctorLanguages(catalogue, locale);
	if (words.length > 0) {
		const found = sorted.filter((language) => doctorLanguageMatches(language, words));
		return {
			kind: 'search',
			found: found.map(row),
			none:
				found.length === 0 ? m.doctor_languages_no_match({ query: query.trim() }, { locale }) : null
		};
	}
	return {
		kind: 'lists',
		yours: sorted.filter((language) => top.includes(language.code)).map(row),
		all: sorted.filter((language) => !top.includes(language.code)).map(row)
	};
}

/**
 * 🔴 D-W52-69: a press on a row — a chosen one goes out; another comes in only below the limit (at it the press changes
 * nothing: the row is out, and the server refuses an eleventh too). The set keeps the order of the presses; the server
 * stores and answers it in its own.
 */
export function toggleDoctorLanguage(chosen: readonly string[], code: string): string[] {
	if (chosen.includes(code)) return chosen.filter((entry) => entry !== code);
	return chosen.length < DOCTOR_SPEAK_LANGUAGE_LIMIT ? [...chosen, code] : [...chosen];
}

/** Whether two choices hold the same codes, in any order («Αποθήκευση» waits for a change). */
export function sameDoctorLanguages(one: readonly string[], other: readonly string[]): boolean {
	return one.length === other.length && one.every((code) => other.includes(code));
}

/** «2 από 10»: how many are chosen, under the list. */
export function doctorLanguagesCountText(count: number, locale: Locale): string {
	return m.doctor_my_specializations_count(
		{ count, limit: DOCTOR_SPEAK_LANGUAGE_LIMIT },
		{ locale }
	);
}

/**
 * 🔴 D-W52-59α · D-W52-69 (U-140): at the limit «Διαλέξατε 10. Για να διαλέξετε άλλη, βγάλτε μία.» — the line that must
 * always be in sight, over the page's buttons (the catalogue holds 171 rows); `''` below the limit.
 */
export function doctorLanguagesLimitNote(count: number, locale: Locale): string {
	return count >= DOCTOR_SPEAK_LANGUAGE_LIMIT
		? m.doctor_my_specializations_full({ limit: DOCTOR_SPEAK_LANGUAGE_LIMIT }, { locale })
		: '';
}

/** The row «Γλώσσες που μιλάτε» of screen 82: the names in one line and how many they are. */
export type DoctorLanguagesSummary = { names: string; count: string };

/**
 * 🔴 D-W52-69 (`sw.js` `langsBody`): «Ελληνικά, Αγγλικά» over «2 γλώσσες» («1 γλώσσα») — Greek first, then by name in
 * the page's language; `null` for a doctor without a language («Καμία ακόμη»).
 */
export function buildDoctorLanguagesSummary(
	languages: readonly DoctorLanguageFacts[],
	locale: Locale
): DoctorLanguagesSummary | null {
	if (languages.length === 0) return null;
	const options = { locale };
	return {
		names: sortDoctorLanguages(languages, locale)
			.map((language) => language.name)
			.join(', '),
		count:
			languages.length === 1
				? m.doctor_languages_count_one({}, options)
				: m.doctor_languages_count_other({ count: languages.length }, options)
	};
}

/**
 * 🔴 D-W52-69: the page's words for a save the server refused — past ten, the limit's own sentence; a catalogue that no
 * longer holds a code says so (the page reads it again); too many writes; anything else — a write that met another,
 * one that was not allowed, the connection — that the change was not saved (the sentences of screen 80). `session` has
 * no words: the session's own page takes over.
 */
export function doctorLanguagesFailureText(
	failure: Exclude<DoctorLanguagesFailure, 'session'>,
	locale: Locale
): string {
	const options = { locale };
	switch (failure) {
		case 'invalid':
			return m.doctor_my_specializations_full({ limit: DOCTOR_SPEAK_LANGUAGE_LIMIT }, options);
		case 'not-in-catalogue':
			return m.doctor_my_specializations_error_changed({}, options);
		case 'rate-limited':
			return m.doctor_reason_rate_limited({}, options);
		case 'conflict':
		case 'forbidden':
		case 'unknown':
			return m.doctor_my_specializations_error_failed({}, options);
	}
}

import type { DoctorLanguageFacts, DoctorLanguageOptionFacts } from './types';

/** The catalogue's code as the contract writes it (`SL044`): the server's own `SPEAK_LANGUAGE_CODE_PATTERN`. */
const CODE = /^SL[0-9]{3}$/u;
// Long enough for any name of the catalogue, short enough that a broken answer cannot grow what a page draws.
const MAX_NAME = 80;
// The catalogue holds 171 languages; a far longer answer is a broken one, cut here.
const MAX_OPTIONS = 400;
// The server keeps ten languages at most for a doctor (D-W52-66); more is a broken answer.
const MAX_PICKS = 10;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const word = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() && value.trim().length <= MAX_NAME
		? value.trim()
		: null;

/** One language read field by field: a code of the contract's shape and a name that is text. */
function language(view: unknown): DoctorLanguageFacts | null {
	if (!isRecord(view)) return null;
	const code = typeof view.code === 'string' && CODE.test(view.code) ? view.code : null;
	const name = word(view.name);
	return code && name ? { code, name } : null;
}

/**
 * 🔴 D-W52-64 / 69 · U-65.6: the catalogue of languages in the server's order (the page sorts it), each line read field
 * by field — its code, its name, and the name as a search reads it (`normalized`). An answer that is no list is `null`,
 * a failed read; a line that is no line of the catalogue, or a code met twice, is left out — it cannot be picked; the
 * list is cut at its bound.
 */
export function mapDoctorLanguageOptions(view: unknown): DoctorLanguageOptionFacts[] | null {
	if (!Array.isArray(view)) return null;
	const seen = new Set<string>();
	const options: DoctorLanguageOptionFacts[] = [];
	for (const entry of view.slice(0, MAX_OPTIONS)) {
		const line = language(entry);
		const normalized = isRecord(entry) ? word(entry.normalized) : null;
		if (!line || !normalized || seen.has(line.code)) continue;
		seen.add(line.code);
		options.push({ ...line, normalized });
	}
	return options;
}

/**
 * 🔴 D-W52-66 / 69 · U-65.6: the languages of the doctor in the server's order (Greek first, then by name in the
 * language of the request), each read field by field. A save sends the WHOLE set, so a language is never dropped in
 * silence: an answer that is no list, holds a line that is no language, one twice, or more than the ten the server
 * keeps is `null`, a failed read. Nothing else of a row leaves `api/` (no id of the row or of the doctor).
 */
export function mapDoctorLanguages(view: unknown): DoctorLanguageFacts[] | null {
	if (!Array.isArray(view) || view.length > MAX_PICKS) return null;
	const seen = new Set<string>();
	const languages: DoctorLanguageFacts[] = [];
	for (const entry of view) {
		const line = language(entry);
		if (!line || seen.has(line.code)) return null;
		seen.add(line.code);
		languages.push(line);
	}
	return languages;
}

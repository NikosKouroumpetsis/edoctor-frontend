/** The two separators JavaScript reads as a line's end, written as code points (never typed in a source). */
const LINE_SEPARATOR = new RegExp(String.fromCodePoint(0x2028), 'gu');
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCodePoint(0x2029), 'gu');

/**
 * JSON for a `<script type="application/ld+json">` that no page text can end: every `<` (so `</script>`), `>` and `&`
 * written as a JSON escape, and the two line separators JavaScript does not take inside a string (moved out of the
 * doctor's profile, wave 1.5 screen 5, for the articles and the help centre: U-28.4).
 */
export function serializeJsonLd(document: Record<string, unknown>): string {
	return JSON.stringify(document)
		.replace(/</gu, '\\u003c')
		.replace(/>/gu, '\\u003e')
		.replace(/&/gu, '\\u0026')
		.replace(LINE_SEPARATOR, '\\u2028')
		.replace(PARAGRAPH_SEPARATOR, '\\u2029');
}

/**
 * 🔴 Common v2 §B: the ONE raw markup a page writes — its head's JSON-LD script, the document escaped by `serializeJsonLd`
 * (`tests/architecture/raw-html.test.ts`: a `{@html}` only around this).
 */
export function jsonLdScript(document: Record<string, unknown>): string {
	return `<script type="application/ld+json">${serializeJsonLd(document)}</` + `script>`;
}

/** Words cut at a word's end within `limit` characters, «…» when cut (a meta description's room). */
export function clipText(text: string, limit: number): string {
	const flat = text.replace(/\s+/gu, ' ').trim();
	if (flat.length <= limit) return flat;
	const cut = flat.slice(0, limit - 1);
	const end = cut.lastIndexOf(' ');
	return `${(end > 0 ? cut.slice(0, end) : cut).trimEnd()}…`;
}

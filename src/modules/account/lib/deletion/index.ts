/** One run of a sentence: its words and whether they are drawn bold. */
export type EmphasisRun = { text: string; strong: boolean };

/**
 * 🔴 U-62.1 (the prototype 10, Π3): a step of the deletion with the names the reader sees in the application in bold —
 * the sentence's own words, unchanged; a name it does not hold is skipped (the sentence stays whole).
 */
export function emphasizeNames(text: string, names: readonly string[]): EmphasisRun[] {
	const marked = Array.from(text, () => false);
	for (const name of names) {
		if (!name) continue;
		const at = text.indexOf(name);
		if (at < 0) continue;
		for (let index = at; index < at + name.length; index += 1) marked[index] = true;
	}
	const runs: EmphasisRun[] = [];
	for (let index = 0; index < text.length; index += 1) {
		const last = runs.at(-1);
		if (last && last.strong === marked[index]) last.text += text[index];
		else runs.push({ text: text[index], strong: marked[index] });
	}
	return runs;
}

/** A «Διάρκεια: …» line cut at its first colon: the bold label (with the colon) and the rest of the same words. */
export function splitDuration(text: string): { label: string; rest: string } {
	const colon = text.indexOf(':');
	if (colon < 0) return { label: '', rest: text };
	return { label: text.slice(0, colon + 1), rest: text.slice(colon + 1).trim() };
}

/** The deletion page's four sections, in order: their anchors (the prototype 10's Π4). */
export const deletionSectionIds = [
	'from-the-app',
	'without-the-app',
	'deleted-at-once',
	'what-we-keep'
] as const;

export type DeletionSectionId = (typeof deletionSectionIds)[number];

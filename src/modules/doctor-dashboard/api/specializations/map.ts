import type {
	DoctorSpecializationFacts,
	DoctorSpecializationKind,
	DoctorSpecializationOptionFacts,
	DoctorSpecializationStatus
} from './types';

const KINDS: readonly DoctorSpecializationKind[] = ['SOCIETY_AREA', 'FEK_TITLE'];
const STATUSES: readonly DoctorSpecializationStatus[] = ['APPROVED', 'PENDING', 'REJECTED'];
/** The catalogue's code as the contract writes it: the specialty's id and a number (`PR011-03`). */
const CODE = /^PR[0-9]{3}-[0-9]{2}$/u;
// Long enough for any name of the catalogue, short enough that a broken answer cannot grow what a page draws.
const MAX_NAME = 160;
// The longest list of the catalogue holds far fewer; a longer answer is a broken one, cut here.
const MAX_OPTIONS = 100;
// The server keeps three picks at most (D-W52-54); more is a broken answer.
const MAX_PICKS = 3;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const oneOf = <T extends string>(list: readonly T[], value: unknown): T | null =>
	list.find((entry) => entry === value) ?? null;

/** One line of the catalogue read field by field: a code of the contract's shape, a name that is text, a known kind. */
function option(view: unknown): DoctorSpecializationOptionFacts | null {
	if (!isRecord(view)) return null;
	const code = typeof view.code === 'string' && CODE.test(view.code) ? view.code : null;
	const name = typeof view.name === 'string' ? view.name.trim() : '';
	const kind = oneOf(KINDS, view.kind);
	if (!code || !name || name.length > MAX_NAME || !kind) return null;
	return { code, name, kind };
}

/**
 * 🔴 D-W52-54 · U-65.6: the list of the doctor's specialty in the server's order, each line read field by field
 * (`kind` a value of the contract's enum, never guessed). An answer that is no list is `null`, a failed read; a line
 * that is no line of the catalogue, or a code met twice, is left out — it cannot be picked; the list is cut at its
 * bound. `[]` is an answer: the specialty has no list.
 */
export function mapDoctorSpecializationOptions(
	view: unknown
): DoctorSpecializationOptionFacts[] | null {
	if (!Array.isArray(view)) return null;
	const seen = new Set<string>();
	const options: DoctorSpecializationOptionFacts[] = [];
	for (const entry of view.slice(0, MAX_OPTIONS)) {
		const line = option(entry);
		if (!line || seen.has(line.code)) continue;
		seen.add(line.code);
		options.push(line);
	}
	return options;
}

/**
 * 🔴 D-W52-54 / 56α · U-65.6: the doctor's picks in the server's order, each read field by field (`kind`, `status`
 * values of the contract's enums). A save sends the WHOLE set, so a pick is never dropped in silence: an answer that is
 * no list, holds a line that is no pick, one twice, or more than the three the server keeps is `null`, a failed read.
 */
export function mapDoctorSpecializations(view: unknown): DoctorSpecializationFacts[] | null {
	if (!Array.isArray(view) || view.length > MAX_PICKS) return null;
	const seen = new Set<string>();
	const picks: DoctorSpecializationFacts[] = [];
	for (const entry of view) {
		const line = option(entry);
		const status = isRecord(entry) ? oneOf(STATUSES, entry.status) : null;
		if (!line || !status || seen.has(line.code)) return null;
		seen.add(line.code);
		picks.push({ ...line, status });
	}
	return picks;
}

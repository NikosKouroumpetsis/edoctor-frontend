import { isUuid } from '$shared/lib/ids';
import type {
	DoctorCredentialFacts,
	DoctorCredentialItem,
	DoctorCredentialKind,
	DoctorCredentialsBody
} from './types';

const KINDS: readonly DoctorCredentialKind[] = ['STUDY', 'WORK', 'CONFERENCE'];
/** The one language a doctor reads and writes the biography in (U-207.3, D-W52-61). */
const GREEK = 'el';
// The server keeps twenty rows a group (D-W52-61); a longer answer is a broken one.
const MAX_ROWS = 60;
// The server's own bounds of a text; a longer one is a broken answer, never drawn or sent back.
const MAX_TITLE = 300;
const MAX_ORGANIZATION = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const isYear = (value: unknown): value is number | null =>
	value === null || (typeof value === 'number' && Number.isInteger(value));

/**
 * One row read field by field: an id of the server, a group of the contract's enum, whole years, `isCurrent` a boolean,
 * a place that is a whole number, and its texts a list. `null`: this is no row. `undefined`: a row WITHOUT a Greek text
 * (the backoffice wrote it in another language) — the doctor's page has no words for it.
 */
function row(view: unknown): DoctorCredentialFacts | null | undefined {
	if (!isRecord(view)) return null;
	const { id, kind, startYear, endYear, isCurrent, position, translations } = view;
	const group = KINDS.find((entry) => entry === kind);
	if (typeof id !== 'string' || !isUuid(id) || !group) return null;
	if (!isYear(startYear) || !isYear(endYear) || typeof isCurrent !== 'boolean') return null;
	if (typeof position !== 'number' || !Number.isInteger(position) || position < 0) return null;
	if (!Array.isArray(translations) || !translations.every(isRecord)) return null;
	const greek = translations.find((text) => text.language === GREEK);
	if (!greek) return undefined;
	const title = typeof greek.title === 'string' ? greek.title.trim() : '';
	const organization =
		greek.organization === null || greek.organization === undefined
			? ''
			: typeof greek.organization === 'string'
				? greek.organization.trim()
				: null;
	if (!title || title.length > MAX_TITLE) return null;
	if (organization === null || organization.length > MAX_ORGANIZATION) return null;
	return {
		id,
		kind: group,
		title,
		organization: organization || null,
		startYear,
		endYear,
		isCurrent,
		position
	};
}

/**
 * 🔴 D-W52-61 / 63 · U-65.6: the doctor's biography in the SERVER's order (the groups in turn, each as the public page
 * orders it — the clients never sort), each row read field by field and in Greek alone (U-207.3). A save sends a WHOLE
 * group back, so a row is never dropped in silence: an answer that is no list, is longer than the server keeps, or
 * holds a line that is no row or an id twice is `null`, a failed read. A row without a Greek text is left out: the
 * doctor's page cannot show or send it (a save of its group keeps Greek alone, D-W52-61α).
 */
export function mapDoctorCredentials(view: unknown): DoctorCredentialFacts[] | null {
	if (!Array.isArray(view) || view.length > MAX_ROWS) return null;
	const seen = new Set<string>();
	const rows: DoctorCredentialFacts[] = [];
	for (const entry of view) {
		const line = row(entry);
		if (line === null) return null;
		if (line === undefined) continue;
		if (seen.has(line.id)) return null;
		seen.add(line.id);
		rows.push(line);
	}
	return rows;
}

/**
 * 🔴 D-W52-61 (U-207.3): the body of a save, field by field — the group and its rows in the order given, each with ONE
 * text, the Greek one (any other language is refused, `DOCTOR_WRITES_GREEK_ONLY`). Never an id, never a doctor
 * (`tenantUserId` is the backoffice's), never a field the contract does not name.
 */
export function toDoctorCredentialsBody(
	kind: DoctorCredentialKind,
	items: readonly DoctorCredentialItem[]
): DoctorCredentialsBody {
	return {
		kind,
		items: items.map((item) => ({
			startYear: item.startYear,
			endYear: item.endYear,
			isCurrent: item.isCurrent,
			translations: [{ language: GREEK, title: item.title, organization: item.organization }]
		}))
	};
}

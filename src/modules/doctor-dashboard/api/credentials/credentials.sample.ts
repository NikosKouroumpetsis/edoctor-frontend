import type { DoctorCredentialsView } from './types';

type SampleRow = DoctorCredentialsView[number];
type SampleKind = SampleRow['kind'];
type SampleAnswer = { status: number; data?: unknown; body?: unknown };
type SampleCall = { method: string; path: string; search: string; body: unknown };

const KINDS: readonly SampleKind[] = ['STUDY', 'WORK', 'CONFERENCE'];
/** Tests only: server ids of the made-up rows, `…c001`, `…c002`, … in the order they were written. */
export const sampleCredentialId = (index: number) =>
	`0193d000-0000-7000-8000-00000000c${String(index).padStart(3, '0')}`;

const line = (
	index: number,
	kind: SampleKind,
	position: number,
	title: string,
	organization: string | null,
	startYear: number | null,
	endYear: number | null,
	isCurrent = false
): SampleRow => ({
	id: sampleCredentialId(index),
	kind,
	startYear,
	endYear,
	isCurrent,
	position,
	// As the seed writes a row: the Greek text and an English one beside it.
	translations: [
		{ language: 'el', title, organization },
		{ language: 'en', title: `${title} (EN)`, organization: organization && `${organization} (EN)` }
	]
});

/** The public page's order inside a group (`w52-b5` §2): the current first, the latest year, the written order. */
function shown(rows: readonly SampleRow[]): SampleRow[] {
	const last = (row: SampleRow) => row.endYear ?? row.startYear;
	return KINDS.flatMap((kind) =>
		rows
			.filter((row) => row.kind === kind)
			.sort((one, other) => {
				if (one.isCurrent !== other.isCurrent) return one.isCurrent ? -1 : 1;
				const [a, b] = [last(one), last(other)];
				if (a === null || b === null) {
					if (a !== b) return a === null ? 1 : -1;
				} else if (a !== b) return b - a;
				if ((one.startYear ?? 0) !== (other.startYear ?? 0)) {
					return (other.startYear ?? 0) - (one.startYear ?? 0);
				}
				return one.position - other.position;
			})
	);
}

/**
 * Tests only: `GET /doctor/profile/credentials` as the contract writes it — the prototype's biography (`sw.js` `CV`):
 * two studies, three positions (one of them «σήμερα») and a conference, for a made-up doctor, in the server's order.
 * The positions are WRITTEN oldest first, so the order on the page is not the written one.
 */
export function sampleCredentialsView(): DoctorCredentialsView {
	return shown([
		line(1, 'STUDY', 0, 'Πτυχίο Ιατρικής', 'Ιατρική Σχολή Αθηνών', 2001, 2007),
		line(2, 'STUDY', 1, 'Ειδικότητα Καρδιολογίας', 'Γενικό Νοσοκομείο Αθηνών', 2008, 2013),
		line(3, 'WORK', 0, 'Ιατρός υπηρεσίας υπαίθρου', 'Κέντρο Υγείας Καρύστου', 2007, 2008),
		line(
			4,
			'WORK',
			1,
			'Επιμελήτρια Καρδιολογικής Κλινικής',
			'Γενικό Νοσοκομείο Αθηνών',
			2013,
			2015
		),
		line(5, 'WORK', 2, 'Καρδιολόγος, ιδιωτικό ιατρείο', 'Κηφισιά', 2015, null, true),
		line(
			6,
			'CONFERENCE',
			0,
			'Πανελλήνιο Καρδιολογικό Συνέδριο',
			'Ελληνική Καρδιολογική Εταιρεία',
			2025,
			null
		)
	]);
}

/** Tests only: a group of `count` rows of one kind (the limit's cases), written one after the other. */
export function sampleCredentialGroup(kind: SampleKind, count: number): DoctorCredentialsView {
	return Array.from({ length: count }, (_, index) =>
		line(100 + index, kind, index, `Γραμμή ${index + 1}`, null, 2000, null)
	);
}

/**
 * Tests only: the API of screen 81 as `w52-b5` writes it, in memory, for a made-up doctor — `GET` of the whole
 * biography in the server's order and `PUT` of ONE whole group: a field the contract does not name, more than twenty
 * rows, a year out of 1950 … `lastYear`, an end without a start or before it, «σήμερα» without a start, with an end or
 * on a conference, a title with nothing left ⇒ 422; a language that is not Greek ⇒ 422 with the server's marker. A
 * save gives every row of the group a NEW id and its place, the other groups stay, and the answer is the whole
 * biography. Every call is kept (`calls`); `refuse` / `plant` set the answer of the next call of a kind, `hold` keeps
 * the next `PUT` on its way until `release()`. `fetch` is handed to `vi.stubGlobal`.
 */
export function sampleCredentialsServer(
	start: { rows?: DoctorCredentialsView; lastYear?: number; profile?: () => unknown } = {}
) {
	let rows: SampleRow[] = [...(start.rows ?? sampleCredentialsView())];
	const lastYear = start.lastYear ?? 2027;
	const calls: SampleCall[] = [];
	const planted: { method: string; ending: string; answer: SampleAnswer }[] = [];
	let held: (() => void) | null = null;
	let holdNext = false;
	let minted = 500;

	const reply = ({ status, data, body }: SampleAnswer) =>
		new Response(
			JSON.stringify(
				body ?? { status: status < 400 ? 'success' : 'error', message: '', data: data ?? null }
			),
			{ status }
		);
	const refusal = (status: number, errorMessage: string): SampleAnswer => ({
		status,
		body: { errorCode: `EC${status}`, errorMessage }
	});
	const invalid = (why: string) => refusal(422, `Validation Error: ${why}`);
	const only = (value: object, keys: string[]) =>
		Object.keys(value).every((key) => keys.includes(key));
	const yearOk = (year: unknown) =>
		year === undefined ||
		year === null ||
		(Number.isInteger(year) && (year as number) >= 1950 && (year as number) <= lastYear);

	function write(body: unknown): SampleAnswer {
		const { kind, items } = (body ?? {}) as { kind?: SampleKind; items?: unknown };
		if (!body || !only(body, ['kind', 'items'])) return invalid('unknown field');
		if (!kind || !KINDS.includes(kind) || !Array.isArray(items)) return invalid('kind, items');
		if (items.length > 20) return invalid('items must hold at most 20 rows.');
		const next: SampleRow[] = [];
		for (const [position, item] of items.entries()) {
			if (!only(item, ['startYear', 'endYear', 'isCurrent', 'translations'])) {
				return invalid('unknown field of an item');
			}
			const { startYear = null, endYear = null, isCurrent = false, translations } = item;
			if (!Array.isArray(translations) || translations.length < 1 || translations.length > 2) {
				return invalid('translations');
			}
			if (!yearOk(startYear) || !yearOk(endYear)) return invalid('a whole year');
			if (endYear !== null && (startYear === null || endYear < startYear))
				return invalid('endYear');
			if (isCurrent && (startYear === null || endYear !== null || kind === 'CONFERENCE')) {
				return invalid('isCurrent');
			}
			for (const text of translations) {
				if (!only(text, ['language', 'title', 'organization'])) return invalid('unknown text');
				if (typeof text.title !== 'string' || !text.title.trim() || text.title.length > 300) {
					return invalid('title is required.');
				}
				if (typeof text.organization === 'string' && text.organization.length > 200) {
					return invalid('organization');
				}
			}
			if (translations.some((text: { language: string }) => text.language !== 'el')) {
				return invalid('DOCTOR_WRITES_GREEK_ONLY');
			}
			minted += 1;
			next.push({
				id: sampleCredentialId(minted),
				kind,
				startYear,
				endYear,
				isCurrent,
				position,
				translations: translations.map((text: { title: string; organization?: string | null }) => ({
					language: 'el' as const,
					title: text.title.trim(),
					organization: text.organization?.trim() || null
				}))
			});
		}
		rows = shown([...rows.filter((row) => row.kind !== kind), ...next]);
		return { status: 200, data: rows };
	}

	async function fetchStub(input: string | URL | Request, init?: RequestInit): Promise<Response> {
		const url = new URL(input instanceof Request ? input.url : String(input));
		const method = init?.method ?? 'GET';
		const path = url.pathname.replace(/^.*\/api\/v\d+/u, '');
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
		calls.push({ method, path, search: url.search, body });
		if (method === 'PUT' && holdNext) {
			holdNext = false;
			await new Promise<void>((resolve) => (held = resolve));
		}
		const index = planted.findIndex(
			(entry) => entry.method === method && path.endsWith(entry.ending)
		);
		if (index >= 0) return reply(planted.splice(index, 1)[0].answer);
		if (method === 'GET' && path === '/doctor/me/profile' && start.profile) {
			return reply({ status: 200, data: start.profile() });
		}
		if (method === 'GET' && path === '/doctor/profile/credentials') {
			return reply({ status: 200, data: rows });
		}
		if (method === 'PUT' && path === '/doctor/profile/credentials') return reply(write(body));
		return reply(refusal(404, 'Resource not found'));
	}

	return {
		fetch: fetchStub,
		calls,
		/** The Greek titles the server keeps now for one group, in the order of the page. */
		titles: (kind: SampleKind) =>
			rows
				.filter((row) => row.kind === kind)
				.map((row) => row.translations.find((text) => text.language === 'el')?.title),
		/** The rows the server keeps now. */
		rows: () => rows,
		/** Another tab, or the team, wrote meanwhile: what the next reads find. */
		set(next: DoctorCredentialsView) {
			rows = shown(next);
		},
		/** The next call of `method` whose path ends with `ending` is answered with this. */
		refuse(method: string, ending: string, status: number, errorMessage = 'Refused') {
			planted.push({ method, ending, answer: refusal(status, errorMessage) });
		},
		plant(method: string, ending: string, answer: SampleAnswer) {
			planted.push({ method, ending, answer });
		},
		/** The next `PUT` stays on its way until `release()`. */
		hold() {
			holdNext = true;
		},
		release() {
			held?.();
			held = null;
		},
		callsOf: (method: string, ending = '') =>
			calls.filter((call) => call.method === method && call.path.endsWith(ending))
	};
}

export type SampleCredentialsServer = ReturnType<typeof sampleCredentialsServer>;

import { describe, expect, it } from 'vitest';
import { classStrings, readSourceFiles, stripComments, type SourceFile } from './source-scan';

/**
 * 🔴 Wave 4.0 · where the rules of the patient's pages live (card w4-w9; D-W4-61: the project's contract wins every
 * document of the wave). One planted negative per rule (D-110: no mutation).
 * - D-W4-61 · L-1 («Screens compose; feature behavior and data contracts live in modules»): the pages of the two
 *   screens that share the list hold no rune state, no effect and no read of the session, the screen's width or the
 *   appointments' own reads — the module's ONE hook tells them (`useAppointmentsPages`).
 * - D-W4-61 · L-2 («Form state uses … `createForm` … connect fields via `form.field(name)`»): the forms of screens 52
 *   (the note), 53 and 54 are the shared form; none keeps a field in a rune of its own.
 * - D-W4-59 · D-W4-21: the read of the upcoming «to the end, ten pages at most» is the module's `api/`; no page, hook
 *   of a slice or screen pages through the appointments itself.
 * - U-139.5 · D-W4-22: a relationship's word is said by the ONE helper (`lib/relatives/words`); the neutral words are
 *   also the form's options (`lib/relatives/form`, D-W4-74: the choice is the relationship) — nowhere else.
 * - D-W4-52: the Messages stand on the `SplitView` (its `inbox` widths), and lay out no columns of their own.
 * - Σ1: `createQueries` is read through `combine` that answers ONE object, never as the library's array — nor as an
 *   array of the reader's own (review w4-w9-r1 MINOR-2: the library's proxy treats any array alike).
 * - D-W4-78: what stays open through a session that ended on a write is decided in ONE place (`useKeptThroughExpiry`,
 *   on the `Session`'s `expired`); no page, hook or screen reads `expired` to decide it again — by whatever name it
 *   calls the session, through a call's answer, a pattern or a key (review w4-w10-r2 MINOR-1), and the `Session`
 *   itself only writes it. What a text scan cannot see: a key worked out at run time (`session[name]`), a copy of the
 *   whole session (`{ ...session }`, `Object.entries`). U-153 (card w4-w12): the sign-in's host reads it ONCE, and only
 *   to END it — a page the browser puts back from its back/forward cache is left as by «×»; it keeps nothing by it.
 */
const THIN_SCREENS =
	/^src\/screens\/(?:appointments\/\[\.\.\.path\]|ratings\/\[invitationId\])\/page\/index\.svelte$/u;
const SCREEN_RULES: { pattern: RegExp; reason: string }[] = [
	{ pattern: /\$state\s*[(<]/u, reason: 'a rune state' },
	{ pattern: /\$effect\s*[.(]/u, reason: 'an effect' },
	{ pattern: /\bgetSession(?:Optional)?\s*\(/u, reason: 'the session read' },
	{ pattern: /\bnew\s+MediaQuery\b|\bmatchMedia\s*\(/u, reason: 'the screen’s width read' },
	{
		pattern:
			/\buse(?:AppointmentsList|AppointmentDetail|RatingInvitation|AppointmentsMemory)\s*\(/u,
		reason: 'a read of the appointments’ own'
	}
];

function findScreenIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) =>
		THIN_SCREENS.test(file.path)
			? SCREEN_RULES.filter(({ pattern }) => pattern.test(file.text)).map(
					({ reason }) => `${file.path}: ${reason} (L-1)`
				)
			: []
	);
}

const FORM_SLICES = /^src\/modules\/appointments\/ui\/(?:rating|cancel|change)\/.*\.svelte$/u;
const FORM_FIELD = /<(?:NoteField|StarInput|RadioRows)\b/u;
const FORM_IMPORT = /import\s*\{[^}]*\bcreateForm\b[^}]*\}\s*from\s*'\$shared\/lib\/form';/u;
/** A field's value kept in a rune of the page: `let text = $state('')`, `let values = $state<…>(…)`. */
const FIELD_RUNE = /\blet\s+(?:text|note|reason|values|comment|message)\b[^=\n]*=\s*\$state\b/u;

function findFormIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		if (!FORM_SLICES.test(file.path) || !FORM_FIELD.test(file.text)) return [];
		// «Για ποιον…» and the hour are choices of ONE thing kept by the change's own hook, not forms (no field typed).
		if (!/<(?:NoteField|StarInput)\b/u.test(file.text) && !/\bcancel\//u.test(file.path)) return [];
		const found: string[] = [];
		if (!FORM_IMPORT.test(file.text)) found.push(`${file.path}: a form without createForm (L-2)`);
		if (!/\bform\.field\(/u.test(file.text)) {
			found.push(`${file.path}: no field connected with form.field (L-2)`);
		}
		if (FIELD_RUNE.test(file.text)) found.push(`${file.path}: a field kept in a rune (L-2)`);
		return found;
	});
}

const APPOINTMENTS_API = /^src\/modules\/appointments\/api\//u;
const PAGED_READ =
	/\blistAppointments\s*\(|\bAPPOINTMENTS_SCAN_(?:LIMIT|MAX_PAGES)\b|\bnextCursor\b/u;
const SCAN_SCOPE =
	/^src\/(?:modules\/appointments\/ui\/|screens\/(?:appointments|ratings|profile)\/)/u;

function findScanIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) =>
		SCAN_SCOPE.test(file.path) && !APPOINTMENTS_API.test(file.path) && PAGED_READ.test(file.text)
			? [`${file.path}: pages through the appointments itself (D-W4-59)`]
			: []
	);
}

const RELATION_WORD = /\brelatives_(?:relationship|word)_[a-z_]+\b/u;
const RELATION_HOMES = [
	'src/modules/appointments/lib/relatives/words/index.ts',
	'src/modules/appointments/lib/relatives/form/index.ts'
];
const GENDERED_WORD = /\brelatives_word_[a-z_]+\b/u;

function findRelationIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		if (!file.path.startsWith('src/') || !RELATION_WORD.test(file.text)) return [];
		if (!RELATION_HOMES.includes(file.path)) {
			return [`${file.path}: a relationship’s word outside its helper (U-139.5)`];
		}
		// The form offers the relationships (neutral words); a word by gender is the helper's alone.
		return file.path !== RELATION_HOMES[0] && GENDERED_WORD.test(file.text)
			? [`${file.path}: a gendered word outside its helper (U-139.5)`]
			: [];
	});
}

const INBOX = 'src/modules/messages/ui/inbox/page/index.svelte';
const OWN_COLUMNS = new Set(['grid-split', 'grid-inbox', 'h-split']);

function findInboxIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		if (file.path !== INBOX) return [];
		const found: string[] = [];
		if (!/import \{ SplitView \} from '\$shared\/ui\/templates\/split-view';/u.test(file.text)) {
			found.push(`${file.path}: not on the SplitView (D-W4-52)`);
		}
		if (!/<SplitView\b[^>]*\bwidths="inbox"/u.test(file.text)) {
			found.push(`${file.path}: not the inbox’s widths (D-W4-52)`);
		}
		const own = classStrings(file.text).flatMap(({ tokens }) =>
			tokens.filter((token) => OWN_COLUMNS.has(token.split(':').pop() ?? ''))
		);
		if (own.length > 0) found.push(`${file.path}: columns of its own (${own.join(' ')}) (D-W4-52)`);
		return found;
	});
}

/** `combine: (results) => ({`, `combine: (results): { … } => ({` — an arrow whose answer is an object literal. */
const COMBINE_OBJECT = /\bcombine\s*:\s*\([^()]*\)\s*(?::\s*[^=]*?)?=>\s*\(\s*\{/u;

function findQueriesIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		if (!/\bcreateQueries\s*\(/u.test(file.text)) return [];
		if (!/\bcombine\s*:/u.test(file.text)) {
			return [`${file.path}: createQueries read as the library’s array (Σ1)`];
		}
		return COMBINE_OBJECT.test(file.text)
			? []
			: [`${file.path}: combine does not answer one object (Σ1)`];
	});
}

const EXPIRED_READ = /\bsession\??\.expired\b/u;
const EXPIRED_HOME = 'src/modules/appointments/ui/memory/hooks/use-kept.svelte.ts';
const EXPIRED_OWNER = 'src/shared/state/session/session.svelte.ts';
const KEPT_READERS = [
	'src/modules/appointments/ui/list/hooks/use-pages.svelte.ts',
	'src/modules/appointments/ui/relatives/page/index.svelte'
];
/**
 * U-153 (card w4-w12; live check w4-live-web-3 Δ5) · the ONE other reader: the sign-in's host, which owns that surface's
 * life (it gives the `Session` its `expire`, and every way the sign-in closes passes through it). It asks the mark only
 * to END it — a page the browser puts back from its back/forward cache (`pageshow`, `persisted`) with the ended session
 * still under an open sign-in is left as by «×» — never to keep or draw anything: this one read, in that listener.
 */
const EXPIRED_ENDER = 'src/modules/auth/ui/host/page/index.svelte';
const ENDER_READ = /\bevent\.persisted && session\.expired && !session\.isMember\b/u;
const ENDER_LISTENER = /\baddEventListener\(\s*'pageshow'/u;

/**
 * Review w4-w10-r2 MINOR-1 · the property taken by its name off ANYTHING, whatever the variable is called: `s.expired`,
 * `getSessionOptional()?.expired` (also broken over two lines), `session['expired']`. Not a spread of a local
 * (`...expired`), not a list that holds the word (`['expired']`).
 */
const EXPIRED_MEMBER = /(?<!\.)\.\s*expired\b|(?<=[\w$)\]]|\?\.)\[\s*(['"`])expired\1\s*\]/u;
const BRACKETS = { '{': '}', '(': ')' } as const;

/** Where the bracket opened at `open` closes (`-1`: never). */
function closing(text: string, open: number): number {
	const up = text[open] as keyof typeof BRACKETS;
	let depth = 0;
	for (let index = open; index < text.length; index += 1) {
		if (text[index] === up) depth += 1;
		if (text[index] === BRACKETS[up] && --depth === 0) return index;
	}
	return -1;
}

/** The `up` bracket still open at `at` (`-1`: none). */
function opening(text: string, at: number, up: keyof typeof BRACKETS): number {
	let depth = 0;
	for (let index = at - 1; index >= 0; index -= 1) {
		if (text[index] === BRACKETS[up]) depth += 1;
		if (text[index] === up && depth-- === 0) return index;
	}
	return -1;
}

/** What follows a pattern's `}` once the type written for it is passed: `}: Session = …`, `}: { a: string } = …`. */
function pastType(text: string, from: number): string {
	const rest = text.slice(from);
	if (!/^\s*:/u.test(rest)) return rest;
	let depth = 0;
	for (let index = rest.indexOf(':') + 1; index < rest.length; index += 1) {
		const char = rest[index];
		if (char === '=' && rest[index + 1] === '>') index += 1;
		else if ('{(<['.includes(char)) depth += 1;
		else if ('})>]'.includes(char) && depth-- === 0) return rest.slice(index);
		else if (depth === 0 && '=;,'.includes(char)) return rest.slice(index);
	}
	return '';
}

/**
 * Whether the `{` at `open` takes a value apart (a pattern), not builds one (an object, a type): it is declared and a
 * `=` follows its `}` (`const { … } = session`, also with its type written; `({ … } = session)`), or it is a function's
 * parameter (`({ … }: Session) =>`, `function held({ … }) {`), or it stands inside such a pattern
 * (`{ session: { … } } = …`).
 */
function takesApart(text: string, open: number): boolean {
	const close = closing(text, open);
	if (close < 0) return false;
	const before = text.slice(0, open).trimEnd();
	if (before.endsWith(':')) {
		const outer = opening(text, open, '{');
		return outer >= 0 && takesApart(text, outer);
	}
	const bound = /^\s*=(?![=>])/u.test(pastType(text, close + 1));
	if (/\b(?:const|let|var)$/u.test(before)) return bound;
	if (!/[(,]$/u.test(before)) return false;
	if (bound) return true;
	const parameters = opening(text, open, '(');
	const end = parameters < 0 ? -1 : closing(text, parameters);
	return end >= 0 && /^\s*(?::[^=;{}]*?)?\s*(?:=>|\{)/u.test(text.slice(end + 1));
}

/** `const { expired } = session`, `{ expired: over = false }`, a parameter `({ expired })` — the word as a pattern's key. */
function destructuresExpired(text: string): boolean {
	return [...text.matchAll(/\bexpired\b/gu)].some((match) => {
		const at = match.index ?? 0;
		const isKey =
			/[{,]\s*$/u.test(text.slice(0, at)) && /^\s*[},:=]/u.test(text.slice(at + match[0].length));
		const open = isKey ? opening(text, at, '{') : -1;
		return open >= 0 && takesApart(text, open);
	});
}

const readsExpired = (text: string) => EXPIRED_MEMBER.test(text) || destructuresExpired(text);

function findExpiryIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) =>
		file.path !== EXPIRED_HOME &&
		file.path !== EXPIRED_OWNER &&
		file.path !== EXPIRED_ENDER &&
		!file.path.endsWith('.harness.svelte') &&
		readsExpired(file.text)
			? [`${file.path}: decides what an ended session keeps by itself (D-W4-78)`]
			: []
	);
}

/** The host's ONE read is the condition of its `pageshow` listener; any other read of the mark in it is reported. */
function findExpiryEnderIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		if (file.path !== EXPIRED_ENDER) return [];
		const allowed = ENDER_LISTENER.test(file.text) ? file.text.replace(ENDER_READ, '') : file.text;
		return readsExpired(allowed)
			? [
					`${file.path}: reads \`expired\` beyond ending it on a page put back from the browser’s cache (D-W4-78, U-153)`
				]
			: [];
	});
}

/**
 * The `Session` declares the mark and writes it — it never READS it: a getter or a derived value of its own would be
 * `expired` under another name, free for any page to ask (review w4-w10-r2 MINOR-1, «με άλλο όνομα»).
 */
function findExpiryOwnerIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		if (file.path !== EXPIRED_OWNER) return [];
		const written = file.text
			.replace(/\bexpired\s*=\s*\$state\b/gu, '')
			.replace(/\bthis\.expired\s*=(?!=)/gu, '');
		return /\bexpired\b/u.test(written)
			? [
					`${file.path}: the Session reads its own \`expired\` — the mark under another name (D-W4-78)`
				]
			: [];
	});
}

const planted = (path: string, text: string): SourceFile => ({ path, text: stripComments(text) });
const sources = () => readSourceFiles().filter((file) => !file.path.endsWith('.css'));

describe('🔴 D-W4-61 · L-1: the screens of the patient’s pages compose — the feature’s rules are the module’s', () => {
	it('the scan reads the two pages, and the module’s hook is theirs', () => {
		const files = sources();
		const pages = files.filter((file) => THIN_SCREENS.test(file.path));
		expect(pages.map((file) => file.path).sort()).toEqual([
			'src/screens/appointments/[...path]/page/index.svelte',
			'src/screens/ratings/[invitationId]/page/index.svelte'
		]);
		for (const page of pages) {
			expect(page.text, page.path).toMatch(/\buseAppointmentsPages\s*\(\s*\{\s*page:\s*'/u);
		}
		expect(files.map((file) => file.path)).toContain(
			'src/modules/appointments/ui/list/hooks/use-pages.svelte.ts'
		);
	});

	it('D-W4-61 · L-1: neither page holds a rune state, an effect, the session, the screen’s width or a read of the appointments’ own', () => {
		expect(findScreenIssues(sources())).toEqual([]);
	});

	it('(negative, planted) the tab remembered in the page, the list read by the page, the session and the width asked there — each is reported; the module’s hook and another screen may', () => {
		expect(
			findScreenIssues([
				planted(
					'src/screens/appointments/[...path]/page/index.svelte',
					'<script lang="ts">\n\tlet lastTab = $state<AppointmentsTab>(\'upcoming\');\n\t$effect(() => { lastTab = tab; });\n</script>'
				),
				planted(
					'src/screens/ratings/[invitationId]/page/index.svelte',
					'<script lang="ts">\n\tconst session = getSessionOptional();\n\tconst wide = new MediaQuery(`(min-width: 950px)`, false);\n\tconst list = useAppointmentsList({ tab: () => tab, enabled: () => true });\n\tconst visit = useAppointmentDetail({ appointmentId: () => id, enabled: () => true });\n</script>'
				),
				planted(
					'src/modules/appointments/ui/list/hooks/use-pages.svelte.ts',
					"let lastTab = $state('upcoming');\nconst session = getSessionOptional();\n$effect(() => {});"
				),
				planted(
					'src/screens/profile/[...path]/page/index.svelte',
					'<script lang="ts">\n\tconst session = getSessionOptional();\n</script>'
				)
			])
		).toEqual([
			'src/screens/appointments/[...path]/page/index.svelte: a rune state (L-1)',
			'src/screens/appointments/[...path]/page/index.svelte: an effect (L-1)',
			'src/screens/ratings/[invitationId]/page/index.svelte: the session read (L-1)',
			'src/screens/ratings/[invitationId]/page/index.svelte: the screen’s width read (L-1)',
			'src/screens/ratings/[invitationId]/page/index.svelte: a read of the appointments’ own (L-1)'
		]);
	});
});

describe('🔴 D-W4-61 · L-2: the forms of screens 52 / 53 / 54 are the shared `createForm`', () => {
	it('the three forms are read, each with `createForm` and `form.field`', () => {
		const files = sources().filter(
			(file) => FORM_SLICES.test(file.path) && FORM_IMPORT.test(file.text)
		);
		expect(files.map((file) => file.path).sort()).toEqual([
			'src/modules/appointments/ui/cancel/page/index.svelte',
			'src/modules/appointments/ui/change/page/note.svelte',
			'src/modules/appointments/ui/rating/page/index.svelte'
		]);
	});

	it('D-W4-61 · L-2: no form of the three slices without `createForm`, none with a field in a rune of its own', () => {
		expect(findFormIssues(sources())).toEqual([]);
	});

	it('(negative, planted) the note, the reason and the stars kept by hand — each is reported; a choice that is no form («Για ποιον…») is not this rule’s', () => {
		expect(
			findFormIssues([
				planted(
					'src/modules/appointments/ui/change/page/note.svelte',
					'<script lang="ts">\n\tlet note = $state(\'\');\n</script>\n<NoteField value={note} onInput={(value) => (note = value)} />'
				),
				planted(
					'src/modules/appointments/ui/cancel/page/index.svelte',
					"<script lang=\"ts\">\n\timport { createForm } from '$shared/lib/form';\n\tlet reason = $state<string | null>(null);\n\tconst form = createForm({ initialValues: { message: '' } });\n\tconst message = form.field('message');\n</script>\n<RadioRows value={reason} />\n<NoteField value={message.value} />"
				),
				planted(
					'src/modules/appointments/ui/rating/page/index.svelte',
					'<script lang="ts">\n\timport { createForm } from \'$shared/lib/form\';\n\tconst form = createForm({ initialValues: {} });\n</script>\n<StarInput value={form.values.trust} />'
				),
				planted(
					'src/modules/appointments/ui/change/page/for-whom.svelte',
					'<script lang="ts">\n\tlet chosen = $state<string | null>(null);\n</script>\n<RadioRows value={chosen} />'
				)
			])
		).toEqual([
			'src/modules/appointments/ui/change/page/note.svelte: a form without createForm (L-2)',
			'src/modules/appointments/ui/change/page/note.svelte: no field connected with form.field (L-2)',
			'src/modules/appointments/ui/change/page/note.svelte: a field kept in a rune (L-2)',
			'src/modules/appointments/ui/cancel/page/index.svelte: a field kept in a rune (L-2)',
			'src/modules/appointments/ui/rating/page/index.svelte: no field connected with form.field (L-2)'
		]);
	});
});

describe('🔴 D-W4-59 · D-W4-21: the upcoming are read to the end by the module’s `api/`, never by a page', () => {
	it('the scan lives where it says, and no slice or screen pages through the appointments', () => {
		const files = sources();
		const home = files.find(
			(file) => file.path === 'src/modules/appointments/api/appointment/queries.ts'
		);
		expect(home?.text).toMatch(/read < APPOINTMENTS_SCAN_MAX_PAGES/u);
		expect(home?.text).toMatch(/limit: APPOINTMENTS_SCAN_LIMIT/u);
		expect(files.filter((file) => SCAN_SCOPE.test(file.path)).length).toBeGreaterThan(60);
		expect(findScanIssues(files)).toEqual([]);
	});

	it('(negative, planted) a window that reads the next pages itself, a screen that asks the list — each is reported; the `api/` is the rule', () => {
		expect(
			findScanIssues([
				planted(
					'src/modules/appointments/ui/relatives/components/delete-dialog.svelte',
					'<script lang="ts">\n\twhile (page.nextCursor) page = await read(page.nextCursor);\n</script>'
				),
				planted(
					'src/screens/profile/[...path]/page/index.svelte',
					'<script lang="ts">\n\tconst first = await listAppointments({ scope: \'upcoming\', limit: 100 });\n</script>'
				),
				planted(
					'src/modules/appointments/ui/relatives/hooks/use-upcoming.svelte.ts',
					'for (let read = 0; read < APPOINTMENTS_SCAN_MAX_PAGES; read += 1) {}'
				),
				planted(
					'src/modules/appointments/api/appointment/queries.ts',
					"const page = await listAppointments({ scope: 'upcoming', limit: APPOINTMENTS_SCAN_LIMIT, cursor });"
				)
			])
		).toEqual([
			'src/modules/appointments/ui/relatives/components/delete-dialog.svelte: pages through the appointments itself (D-W4-59)',
			'src/screens/profile/[...path]/page/index.svelte: pages through the appointments itself (D-W4-59)',
			'src/modules/appointments/ui/relatives/hooks/use-upcoming.svelte.ts: pages through the appointments itself (D-W4-59)'
		]);
	});
});

describe('🔴 U-139.5 · D-W4-22: a relationship’s word is said by the ONE helper', () => {
	it('U-139.5: the words are read in `lib/relatives/words` (and, the neutral ones, as the form’s options) — nowhere else of `src/`', () => {
		const files = sources();
		for (const path of RELATION_HOMES) {
			expect(files.find((file) => file.path === path)?.text, path).toMatch(RELATION_WORD);
		}
		expect(findRelationIssues(files)).toEqual([]);
	});

	it('(negative, planted) «Κόρη» written by a card, by the booking’s summary, by the form — each is reported', () => {
		expect(
			findRelationIssues([
				planted(
					'src/modules/appointments/ui/list/components/card.svelte',
					'<span>{m.relatives_word_daughter({}, options)}</span>'
				),
				planted(
					'src/modules/appointments/lib/booking/summary/index.ts',
					'const word = m.relatives_relationship_child({}, options);'
				),
				planted(
					'src/modules/appointments/lib/relatives/form/index.ts',
					"const CHILD = gender === 'FEMALE' ? m.relatives_word_daughter : m.relatives_relationship_child;"
				),
				planted(
					'src/modules/appointments/lib/relatives/words/index.ts',
					'const WORDS = { CHILD: m.relatives_relationship_child, DAUGHTER: m.relatives_word_daughter };'
				)
			])
		).toEqual([
			'src/modules/appointments/ui/list/components/card.svelte: a relationship’s word outside its helper (U-139.5)',
			'src/modules/appointments/lib/booking/summary/index.ts: a relationship’s word outside its helper (U-139.5)',
			'src/modules/appointments/lib/relatives/form/index.ts: a gendered word outside its helper (U-139.5)'
		]);
	});
});

describe('🔴 D-W4-52: the Messages stand on the `SplitView`, with no visible change', () => {
	it('D-W4-52: the inbox composes the template with its own widths and lays out no columns itself', () => {
		const files = sources();
		expect(files.map((file) => file.path)).toContain(INBOX);
		expect(findInboxIssues(files)).toEqual([]);
		// The inbox's widths are the template's own class names (380 / 400), the appointments' the other pair.
		const template = files.find(
			(file) => file.path === 'src/shared/ui/templates/split-view/split-view.svelte'
		);
		expect(template?.text).toMatch(/inbox: '[^']*split:grid-inbox[^']*'/u);
		expect(template?.text).toMatch(/wide: '[^']*split:grid-split[^']*'/u);
	});

	it('(negative, planted) the inbox off the template, on the appointments’ widths, or with a grid of its own — each is reported', () => {
		expect(
			findInboxIssues([
				planted(INBOX, '<div class="split:grid split:grid-inbox split:h-split"></div>')
			])
		).toEqual([
			`${INBOX}: not on the SplitView (D-W4-52)`,
			`${INBOX}: not the inbox’s widths (D-W4-52)`,
			`${INBOX}: columns of its own (split:grid-inbox split:h-split) (D-W4-52)`
		]);
		expect(
			findInboxIssues([
				planted(
					INBOX,
					'<script lang="ts">\n\timport { SplitView } from \'$shared/ui/templates/split-view\';\n</script>\n<SplitView list={column} widths="wide" open={true}></SplitView>'
				)
			])
		).toEqual([`${INBOX}: not the inbox’s widths (D-W4-52)`]);
	});
});

describe('🔴 Σ1 (live check of wave 4.0): `createQueries` is read through `combine`', () => {
	it('Σ1: the two readers of the site tell their reads as one object, never as the library’s array', () => {
		const files = sources().filter((file) => /\bcreateQueries\s*\(/u.test(file.text));
		expect(files.map((file) => file.path).sort()).toEqual([
			'src/modules/doctor/ui/availability-picker/hooks/use-office-slots.svelte.ts',
			'src/modules/doctor/ui/public-profiles/hooks/use-public-profiles.svelte.ts'
		]);
		expect(findQueriesIssues(files)).toEqual([]);
	});

	it('(negative, planted) a third reader that keeps the array is reported', () => {
		expect(
			findQueriesIssues([
				planted(
					'src/modules/doctor/ui/detail/hooks/use-offices.svelte.ts',
					'const reads = createQueries(() => ({ queries: ids.map((id) => officeQuery(id)) }));'
				),
				planted(
					'src/modules/doctor/ui/public-profiles/hooks/use-public-profiles.svelte.ts',
					'const read = createQueries(() => ({ queries, combine: (results) => ({ byId: {} }) }));'
				)
			])
		).toEqual([
			'src/modules/doctor/ui/detail/hooks/use-offices.svelte.ts: createQueries read as the library’s array (Σ1)'
		]);
	});

	it('🔴 Σ1 (review w4-w9-r1 MINOR-2; negative, planted) a `combine` that answers an ARRAY — mapped, written out, or built in a body — is reported: the proxy deletes its indexes like the library’s own; an object, also with its type written, is not', () => {
		expect(
			findQueriesIssues([
				planted(
					'src/modules/doctor/ui/detail/hooks/use-offices.svelte.ts',
					'const reads = createQueries(() => ({ queries, combine: (results) => results.map((read) => read.data) }));'
				),
				planted(
					'src/modules/doctor/ui/detail/hooks/use-services.svelte.ts',
					'const reads = createQueries(() => ({ queries, combine: (results) => [results[0]?.data, results[1]?.data] }));'
				),
				planted(
					'src/modules/doctor/ui/detail/hooks/use-days.svelte.ts',
					'const reads = createQueries(() => ({ queries, combine: (results) => { return results.filter((read) => read.isSuccess); } }));'
				),
				planted(
					'src/modules/doctor/ui/detail/hooks/use-typed.svelte.ts',
					'const reads = createQueries(() => ({ queries, combine: (results): { byId: Record<string, Doctor | undefined> } => ({ byId: {} }) }));'
				),
				planted(
					'src/modules/doctor/ui/detail/hooks/use-plain.svelte.ts',
					'const reads = createQueries(() => ({\n\tqueries,\n\tcombine: (results) => ({\n\t\treads: results.map((read) => read.data)\n\t})\n}));'
				)
			])
		).toEqual([
			'src/modules/doctor/ui/detail/hooks/use-offices.svelte.ts: combine does not answer one object (Σ1)',
			'src/modules/doctor/ui/detail/hooks/use-services.svelte.ts: combine does not answer one object (Σ1)',
			'src/modules/doctor/ui/detail/hooks/use-days.svelte.ts: combine does not answer one object (Σ1)'
		]);
	});
});

describe('🔴 D-W4-78: what a session that ended on a write keeps open is decided in ONE place', () => {
	it('D-W4-78: the helper reads the session’s `expired` and `forgotten`; the pages of 52 / 53 and screen 55 ask the helper, and nobody else reads `expired`', () => {
		const files = sources();
		const home = files.find((file) => file.path === EXPIRED_HOME);
		expect(home?.text).toMatch(EXPIRED_READ);
		expect(home?.text).toMatch(/\bsession\.forgotten\b/u);
		for (const path of KEPT_READERS) {
			expect(files.find((file) => file.path === path)?.text, path).toMatch(
				/\buseKeptThroughExpiry\s*</u
			);
		}
		expect(findExpiryIssues(files)).toEqual([]);
	});

	it('(negative, planted) a page, a hook or a screen that keeps its form by reading `expired` itself is reported; the helper and a test’s harness are not', () => {
		expect(
			findExpiryIssues([
				planted(
					'src/modules/appointments/ui/relatives/page/index.svelte',
					'<script lang="ts">\n\tconst listInstead = $derived(viewer === \'guest\' && !session?.expired);\n</script>'
				),
				planted(
					'src/modules/appointments/ui/list/hooks/use-pages.svelte.ts',
					'const opened = $derived(isMember || session.expired ? visit.appointment : null);'
				),
				planted(
					'src/screens/appointments/[...path]/page/index.svelte',
					'<script lang="ts">\n\tconst held = $derived(session.expired);\n</script>'
				),
				planted(EXPIRED_HOME, 'if (session.expired) return kept.value;'),
				planted(
					'src/modules/auth/ui/host/page/probe.harness.svelte',
					'<p data-testid="expired">{String(session.expired)}</p>'
				)
			])
		).toEqual([
			'src/modules/appointments/ui/relatives/page/index.svelte: decides what an ended session keeps by itself (D-W4-78)',
			'src/modules/appointments/ui/list/hooks/use-pages.svelte.ts: decides what an ended session keeps by itself (D-W4-78)',
			'src/screens/appointments/[...path]/page/index.svelte: decides what an ended session keeps by itself (D-W4-78)'
		]);
	});

	it('🔴 D-W4-78 (review w4-w10-r2 MINOR-1): the scan reads the word wherever `src/` writes it — an appointment’s status, the `Session`’s own writes — and reports nobody; the `Session` declares the mark and writes it, never reads it', () => {
		const files = sources();
		const speaking = files
			.filter((file) => /\bexpired\b/u.test(file.text))
			.map((file) => file.path);
		// The word as another thing (a status' key, a text's value): read by the scan, no read of the session's mark.
		for (const path of [
			'src/modules/appointments/lib/status/index.ts',
			'src/modules/appointments/lib/detail/index.ts',
			'src/modules/appointments/api/appointment/map.ts',
			EXPIRED_OWNER,
			EXPIRED_HOME
		]) {
			expect(speaking, path).toContain(path);
		}
		const owner = files.find((file) => file.path === EXPIRED_OWNER);
		expect(owner?.text).toMatch(/\bexpired = \$state\(false\);/u);
		expect(owner?.text.match(/\bthis\.expired = (?:true|false);/gu)).toHaveLength(6);
		expect(findExpiryOwnerIssues(files)).toEqual([]);
		expect(findExpiryIssues(files)).toEqual([]);
	});

	it('🔴 D-W4-78 (review w4-w10-r2 MINOR-1; negative, planted) EVERY way to read it is reported, whatever the session is called: a pattern (plain, renamed with a default and a type, nested, assigned, a function’s parameter), a call’s answer with `?.` (also over two lines), another variable’s name, a key in brackets, the markup', () => {
		const where = (name: string) => `src/modules/appointments/ui/cancel/hooks/${name}.svelte.ts`;
		const forms: [string, string][] = [
			['pattern', 'const session = getSession();\nconst { expired } = session;'],
			[
				'pattern-renamed',
				'const { isMember, expired: over = false }: Session = getSession();\nconst held = $derived(over);'
			],
			['pattern-nested', 'const {\n\tsite: { member, expired }\n} = context;'],
			['pattern-assigned', 'let expired = false;\n({ expired } = getSession());'],
			['parameter', 'const held = ({ expired }: Session): boolean => expired;'],
			[
				'parameter-function',
				'function held(form: Form, { expired }: Session) {\n\treturn expired;\n}'
			],
			['parameter-default', 'function held({ expired } = getSession()) {\n\treturn expired;\n}'],
			['call', 'const held = $derived(getSessionOptional()?.expired ?? false);'],
			['call-two-lines', 'const held = $derived(\n\tgetSessionOptional()\n\t\t?.expired\n);'],
			['other-name', 'const s = getSession();\nconst held = $derived(s.expired);'],
			['key', "const held = $derived(getSession()['expired']);"],
			['key-optional', 'const held = $derived(site?.["expired"]);']
		];
		expect(
			findExpiryIssues([
				...forms.map(([name, text]) => planted(where(name), text)),
				planted(
					'src/modules/appointments/ui/cancel/page/index.svelte',
					'<script lang="ts">\n\tconst visitor = getSessionOptional();\n</script>\n{#if visitor?.expired}<Form />{/if}'
				),
				planted(
					'src/modules/appointments/ui/change/page/note.svelte',
					'<script lang="ts">\n\tconst site = getSession();\n</script>\n{@const { expired } = site}\n<Form held={expired} />'
				)
			])
		).toEqual([
			...forms.map(
				([name]) => `${where(name)}: decides what an ended session keeps by itself (D-W4-78)`
			),
			'src/modules/appointments/ui/cancel/page/index.svelte: decides what an ended session keeps by itself (D-W4-78)',
			'src/modules/appointments/ui/change/page/note.svelte: decides what an ended session keeps by itself (D-W4-78)'
		]);
	});

	it('(negative, planted) what is NO read of the mark is not reported: the word as a status (a key of an object, a text, a list’s entry, a type), a local of that name handed on, an object built with it — and the `Session`, the helper and a harness', () => {
		const where = (name: string) => `src/modules/appointments/lib/status/${name}.ts`;
		expect(
			findExpiryIssues([
				planted(where('tones'), "const TONES = { canceled: 'muted', expired: 'muted' };"),
				planted(where('words'), 'const WORDS = {\n\texpired: m.appointments_status_expired,\n};'),
				planted(
					where('text'),
					"if (appointment.status === 'expired') notice('expired', 'neutral');"
				),
				planted(
					where('list'),
					"const ENDED = new Set(['canceled', 'expired']);\nreturn ['expired'];"
				),
				planted(
					where('type'),
					'type Ended = { expired: boolean };\nconst ended: { expired: boolean } = read();'
				),
				planted(
					where('local'),
					'const expired = rows.filter(isOver);\nreturn { expired, all: [...expired, ...rows] };'
				),
				planted(
					where('built'),
					'save({ expired: true });\nif (same(row, { expired: true })) {\n\tdone();\n}'
				),
				planted(where('nested'), 'const facts = pick({ status: { expired: true } });'),
				planted(EXPIRED_OWNER, 'expired = $state(false);\nexpire() {\n\tthis.expired = true;\n}'),
				planted(EXPIRED_HOME, 'const { expired } = session;'),
				planted(
					'src/modules/appointments/ui/memory/hooks/use-kept.harness.svelte',
					'<pre>{String(session.expired)}</pre>'
				)
			])
		).toEqual([]);
	});

	it('🔴 U-153 (card w4-w12): the sign-in’s host reads `expired` ONCE — the condition of its `pageshow` listener, to end the mark on a page put back from the browser’s cache; the helper stays the one place that KEEPS by it', () => {
		const files = sources();
		const host = files.find((file) => file.path === EXPIRED_ENDER);
		expect(host?.text).toMatch(ENDER_LISTENER);
		expect(host?.text).toMatch(ENDER_READ);
		expect(host?.text.match(/\bexpired\b/gu)).toHaveLength(1);
		expect(findExpiryEnderIssues(files)).toEqual([]);
		expect(findExpiryIssues(files)).toEqual([]);
	});

	it('U-153 (negative, planted) the host reading the mark for anything else — a derived value, the markup, a second read, the same words with no `pageshow` listener — is reported; and the allowed words in ANY other file still are', () => {
		const listener =
			"window.addEventListener('pageshow', (event) => {\n\tif (event.persisted && session.expired && !session.isMember) close();\n});";
		const issue = `${EXPIRED_ENDER}: reads \`expired\` beyond ending it on a page put back from the browser’s cache (D-W4-78, U-153)`;
		expect(findExpiryEnderIssues([planted(EXPIRED_ENDER, listener)])).toEqual([]);
		for (const body of [
			`${listener}\nconst held = $derived(session.expired);`,
			`${listener}\n{#if session.expired}<Form />{/if}`,
			`${listener}\nconst { expired } = session;`,
			`${listener}\nif (event.persisted && session.expired && !session.isMember) keep();`,
			'if (event.persisted && session.expired && !session.isMember) close();',
			"window.addEventListener('pageshow', () => {\n\tif (session.expired) close();\n});"
		]) {
			expect(findExpiryEnderIssues([planted(EXPIRED_ENDER, body)]), body).toEqual([issue]);
		}
		const elsewhere = 'src/modules/appointments/ui/list/hooks/use-pages.svelte.ts';
		expect(findExpiryEnderIssues([planted(elsewhere, listener)])).toEqual([]);
		expect(findExpiryIssues([planted(elsewhere, listener)])).toEqual([
			`${elsewhere}: decides what an ended session keeps by itself (D-W4-78)`
		]);
	});

	it('🔴 D-W4-78 (review w4-w10-r2 MINOR-1; negative, planted) the `Session` handing its mark on under another name — a getter, a derived value, a write that reads it — is reported; declaring it and writing it is not', () => {
		const issue = `${EXPIRED_OWNER}: the Session reads its own \`expired\` — the mark under another name (D-W4-78)`;
		for (const body of [
			'get heldOpen() {\n\treturn this.expired;\n}',
			'readonly heldOpen = $derived(this.expired && this.flowOpen);',
			'cancelSignIn() {\n\tthis.wasExpired = this.expired;\n\tthis.expired = false;\n}',
			'expire() {\n\tthis.expired = !this.expired;\n}'
		]) {
			expect(
				findExpiryOwnerIssues([planted(EXPIRED_OWNER, `expired = $state(false);\n${body}`)]),
				body
			).toEqual([issue]);
		}
		expect(
			findExpiryOwnerIssues([
				planted(
					EXPIRED_OWNER,
					'expired = $state(false);\nexpire() {\n\tthis.expired = true;\n\tif (this.hasPageFlow) this.expired = false;\n}'
				),
				planted('src/modules/appointments/ui/list/hooks/use-pages.svelte.ts', 'session.expired')
			])
		).toEqual([]);
	});
});

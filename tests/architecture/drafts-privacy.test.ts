import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectRoot, readSourceFiles, stripComments, type SourceFile } from './source-scan';

/**
 * 🔴 U-112.2 (the owner, 07/11: «context provider… να μην χανονται τα στοιχεια»), U-65.6: the drafts of wave 3 — the
 * doctor's sign-up and the booking — live in a provider at the
 * root of the site, one per page tree, and nowhere else: no storage, cookie, log or analytics, no raw HTML, no module
 * singleton that would outlive a request on the server. Every read of their APIs wears the sign-out's mark.
 * W-5 / security web MINOR-1: the scope holds their routes (where a personal read would fall into the SSR), the
 * history's reader (`shared/lib/navigation`) and the profile's two screens that read the booking's draft; and no draft
 * goes into the history, the address (beyond the booking's closed hints), another window or a cache of the browser.
 * Wave 4.0 (U-65.6 web · D-W4-63 · P-W4 Σ-28 · security review of the web MINOR-3 · review w4-w7 R1 NIT-4): the scope
 * holds the patient's signed-in pages too — the screens and the routes of `/appointments`, `/ratings`, `/profile`, the
 * doctors those pages read (`doctor/ui/public-profiles`: which doctors a person sees is a fact of their health) and the
 * profile's addresses — so no relative's name, hour, note or review's words reaches an address, a storage or a log.
 */
const SCOPE = new RegExp(
	`^src/(?:${[
		'modules/(?:doctor-onboarding|appointments)/',
		'screens/doctor/onboarding/',
		'screens/doctors/\\[slug\\]/booking/',
		'screens/doctors/\\[slug\\]/hooks/use-screen\\.svelte\\.ts$',
		'screens/doctors/\\[slug\\]/details/\\[section\\]/hooks/use-screen\\.svelte\\.ts$',
		'routes/doctor/onboarding/',
		'routes/doctors/\\[slug\\]/booking/',
		'shared/lib/navigation/',
		// Wave 4.0 · screens 50–55.
		'screens/(?:appointments|ratings|profile)/',
		'routes/(?:appointments|ratings|profile)/',
		'modules/doctor/ui/public-profiles/',
		'modules/profile/lib/paths/'
	].join('|')})`,
	'u'
);
/** The files whose reads are the drafts' own: each of their reads wears the sign-out's mark (MINOR-1 δ). */
const OWN_READS =
	/^src\/(modules\/(doctor-onboarding|appointments)|modules\/doctor\/ui\/public-profiles|screens\/doctor\/onboarding|screens\/doctors\/\[slug\]\/booking|screens\/(appointments|ratings|profile))\//u;
/** The only file that writes the address's search: the booking's closed, non-personal hints (P-W3 §3.2.5). */
const HINTS_WRITER = 'src/modules/appointments/lib/booking/url/index.ts';

const WAYS_OUT: { pattern: RegExp; reason: string }[] = [
	{ pattern: /\b(localStorage|sessionStorage|indexedDB)\b/u, reason: 'a storage' },
	{ pattern: /\bdocument\.cookie\b/u, reason: 'a cookie' },
	{ pattern: /\bconsole\s*\./u, reason: 'a log' },
	{ pattern: /\b(sendBeacon|gtag|dataLayer|analytics)\b/iu, reason: 'analytics' },
	{ pattern: /\bpersistQueryClient\b|\bsetItem\b/u, reason: 'a persisted cache' },
	{ pattern: /\{@html\b|\binnerHTML\b|\binsertAdjacentHTML\b/u, reason: 'raw HTML' },
	// MINOR-1 β: the history's entries (D-W3-31: a real navigation only, with a depth), another window, the browser's cache.
	{ pattern: /\b(pushState|replaceState)\s*\(/u, reason: 'a history entry' },
	{ pattern: /\b(postMessage|BroadcastChannel)\b|\bwindow\.name\b/u, reason: 'another window' },
	{ pattern: /\bcaches\s*\.|\bCacheStorage\b/u, reason: 'a browser cache' }
];

/** MINOR-1 β: what writes an address's search, outside the booking's closed hints. */
const ADDRESS_WRITE =
	/\bnew\s+URLSearchParams\b|\bsearchParams\s*\.\s*(set|append)\s*\(|[?&][\w-]+=\$\{/u;
/**
 * MINOR-1 α: a mutable binding or container at a module's top level (`let`, `var`, `new Map()` …): one for every
 * visitor of the server, which the contract forbids («no mutable user/request state in module-level variables»).
 */
const MODULE_MUTABLE =
	/^(?:export\s+)?(?:(?:let|var)\s+[\w$]|const\s+[\w$]+(?:\s*:[^=]+)?\s*=\s*new\s+(?:Map|Set|WeakMap|WeakSet|Array|Object)\b)/mu;

/** A rune state written at a module's top level (not inside a class or a function): one for every visitor. */
const MODULE_STATE = /^(?:export\s+)?(?:let|const|var)\s+[\w$]+(?:\s*:[^=]+)?\s*=\s*\$state\b/mu;
/** A draft made once at a module's top level (review w3-w1 MINOR-5): one draft for every visitor of the server. */
const MODULE_DRAFT =
	/^(?:export\s+)?(?:let|const|var)\s+[\w$]+(?:\s*:[^=]+)?\s*=\s*new\s+(?:OnboardingDraft|BookingDraft)\b/mu;
/** A component's `<script module>` (or `context="module"`): its body runs once per server, not once per page. */
const SCRIPT_MODULE =
	/<script\b[^>]*\b(?:module|context=["']module["'])[^>]*>([\s\S]*?)<\/script>/gu;
/** The top level of a `<script module>`'s body: Prettier indents it by one tab. */
const indentless = (body: string) => body.replace(/^\t/gmu, '');

const scoped = () => readSourceFiles().filter((file) => SCOPE.test(file.path));

/** Every finding of the drafts' rules in `files`, as `path: reason`. */
function findings(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		if (/\.stories\./u.test(file.path)) return [];
		const found = WAYS_OUT.filter(({ pattern }) => pattern.test(file.text)).map(
			({ reason }) => `${file.path}: ${reason}`
		);
		if (/\.svelte\.ts$/u.test(file.path) && MODULE_STATE.test(file.text)) {
			found.push(`${file.path}: rune state at the module's top level`);
		}
		if (/\.ts$/u.test(file.path) && MODULE_DRAFT.test(file.text)) {
			found.push(`${file.path}: a draft at the module's top level`);
		}
		if (/\.ts$/u.test(file.path) && MODULE_MUTABLE.test(file.text)) {
			found.push(`${file.path}: mutable state at the module's top level`);
		}
		if (file.path !== HINTS_WRITER && ADDRESS_WRITE.test(file.text)) {
			found.push(`${file.path}: an address's search written`);
		}
		if (/\.svelte$/u.test(file.path)) {
			for (const [, body] of file.text.matchAll(SCRIPT_MODULE)) {
				const top = indentless(body);
				if (MODULE_STATE.test(top)) found.push(`${file.path}: rune state in <script module>`);
				if (MODULE_DRAFT.test(top)) found.push(`${file.path}: a draft in <script module>`);
				if (MODULE_MUTABLE.test(top)) found.push(`${file.path}: mutable state in <script module>`);
			}
		}
		// Review w3-w2 R1 MAJOR-1: an answer written into the cache by hand gets no `meta` of its own — the file that
		// writes one marks the key first (`setQueryDefaults(…, { meta: personalQueryMeta })`), as the messages do.
		if (
			/\bsetQueryData\b/u.test(file.text) &&
			!/\bsetQueryDefaults\([^)]*personalQueryMeta/u.test(file.text)
		) {
			found.push(`${file.path}: a cache write without the sign-out's mark`);
		}
		// MINOR-1 δ: every read of the drafts' own files, `api/` or not (a `fetchQuery({ queryKey, queryFn })` in `ui/`).
		if (OWN_READS.test(file.path)) {
			const reads = [...file.text.matchAll(/\bqueryFn\b/gu)].length;
			const marks = [...file.text.matchAll(/meta: personalQueryMeta/gu)].length;
			if (marks < reads) found.push(`${file.path}: a read without the sign-out's mark`);
		}
		return found;
	});
}

const layout = () =>
	stripComments(readFileSync(join(projectRoot, 'src/routes/+layout.svelte'), 'utf8'));

describe('🔴 U-112.2: the drafts live in the root’s provider, and go nowhere', () => {
	it('the scan reads what it says', () => {
		const paths = scoped().map((file) => file.path);
		expect(paths).toContain(
			'src/modules/doctor-onboarding/ui/draft-host/hooks/onboarding-draft.svelte.ts'
		);
		expect(paths).toContain('src/modules/doctor-onboarding/ui/draft-host/page/index.svelte');
		expect(paths).toContain(
			'src/modules/appointments/ui/booking-draft/hooks/booking-draft.svelte.ts'
		);
		expect(paths).toContain('src/modules/appointments/api/readiness/queries.ts');
		// Card w3-w4: the sign-up's pages, its reads and its screen.
		expect(paths).toContain('src/modules/doctor-onboarding/ui/steps/hooks/use-step.svelte.ts');
		expect(paths).toContain('src/modules/doctor-onboarding/api/address-search/queries.ts');
		expect(paths).toContain('src/screens/doctor/onboarding/[...step]/hooks/use-screen.svelte.ts');
		// W-5: every file of the two flows by name — the sign-up's 38–42 and their reads (w3-w5), the booking's change
		// screens, its 31 and its address (w3-w3), their routes and the history's reader, the profile reading the draft.
		for (const path of [
			'src/modules/doctor-onboarding/api/progress/endpoints.ts',
			'src/modules/doctor-onboarding/api/terms/queries.ts',
			'src/modules/doctor-onboarding/api/town/queries.ts',
			'src/modules/doctor-onboarding/api/professions/queries.ts',
			'src/modules/doctor-onboarding/lib/payload/index.ts',
			'src/modules/doctor-onboarding/ui/steps/page/office.svelte',
			'src/modules/doctor-onboarding/ui/steps/page/amenities.svelte',
			'src/modules/doctor-onboarding/ui/steps/page/terms.svelte',
			'src/modules/doctor-onboarding/ui/steps/page/access.svelte',
			'src/modules/doctor-onboarding/ui/steps/page/done.svelte',
			'src/modules/doctor-onboarding/ui/steps/hooks/use-address-search.svelte.ts',
			'src/modules/appointments/api/relatives/endpoints.ts',
			'src/modules/appointments/api/phone/endpoints.ts',
			'src/modules/appointments/lib/booking/url/index.ts',
			'src/modules/appointments/lib/booking/note/index.ts',
			'src/modules/appointments/ui/booking/page/relative.svelte',
			'src/modules/appointments/ui/booking/page/phone.svelte',
			'src/modules/appointments/ui/booking/page/success.svelte',
			'src/modules/appointments/ui/booking/hooks/use-review.svelte.ts',
			'src/screens/doctors/[slug]/booking/[...step]/hooks/use-review.svelte.ts',
			'src/screens/doctors/[slug]/hooks/use-screen.svelte.ts',
			'src/screens/doctors/[slug]/details/[section]/hooks/use-screen.svelte.ts',
			'src/routes/doctors/[slug]/booking/+layout.server.ts',
			'src/routes/doctors/[slug]/booking/[...step]/+page.ts',
			'src/routes/doctor/onboarding/[...step]/+page.ts',
			'src/shared/lib/navigation/stored-page-state.ts',
			// Wave 4.0 (card w4-w9): the patient's signed-in pages, their routes, their doctors and the profile's addresses.
			'src/screens/appointments/[...path]/page/index.svelte',
			'src/screens/appointments/[...path]/hooks/use-screen.svelte.ts',
			'src/screens/appointments/[...path]/hooks/use-time.svelte.ts',
			'src/screens/ratings/[invitationId]/page/index.svelte',
			'src/screens/ratings/[invitationId]/hooks/use-screen.svelte.ts',
			'src/screens/profile/[...path]/page/index.svelte',
			'src/screens/profile/[...path]/hooks/use-screen.svelte.ts',
			'src/routes/appointments/[...path]/+page.ts',
			'src/routes/ratings/[invitationId]/+page.ts',
			'src/routes/profile/[...path]/+page.ts',
			'src/modules/doctor/ui/public-profiles/hooks/use-public-profiles.svelte.ts',
			'src/modules/profile/lib/paths/index.ts',
			'src/modules/appointments/ui/list/hooks/use-pages.svelte.ts',
			'src/modules/appointments/ui/relatives/page/index.svelte',
			'src/modules/appointments/ui/rating/page/index.svelte'
		])
			expect(paths, path).toContain(path);
		expect(paths.every((path) => SCOPE.test(path))).toBe(true);
	});

	it('🔴 U-112.2 / U-65.6: κανένα προσωπικό στοιχείο σε storage, URL, log — no code of the drafts holds a way out', () => {
		expect(findings(scoped())).toEqual([]);
	});

	it('🔴 U-112.2: provider στη ρίζα, όχι module singleton — the root layout composes the sign-up’s host inside the session and around the frame', () => {
		const text = layout();
		expect(text).toMatch(
			/import OnboardingDraftHost from '\$modules\/doctor-onboarding\/ui\/draft-host';/u
		);
		const auth = text.indexOf('<AuthHost');
		const host = text.indexOf('<OnboardingDraftHost>');
		const frame = text.indexOf('<SiteFrame>');
		expect(auth).toBeGreaterThan(-1);
		expect(host).toBeGreaterThan(auth);
		expect(frame).toBeGreaterThan(host);
		expect(text.indexOf('</OnboardingDraftHost>')).toBeGreaterThan(text.indexOf('</SiteFrame>'));
		const draft = scoped().find((file) => file.path.endsWith('onboarding-draft.svelte.ts'));
		expect(draft?.text).toContain("createContext<OnboardingDraft>('OnboardingDraft')");
	});

	it('🔴 U-112.2 (P-W3 §3.2.8): the root layout composes the booking’s host too — inside the session, around the frame', () => {
		const text = layout();
		expect(text).toMatch(
			/import BookingDraftHost from '\$modules\/appointments\/ui\/booking-draft';/u
		);
		const auth = text.indexOf('<AuthHost');
		const host = text.indexOf('<BookingDraftHost>');
		const frame = text.indexOf('<SiteFrame>');
		expect(host).toBeGreaterThan(auth);
		expect(frame).toBeGreaterThan(host);
		expect(text.indexOf('</BookingDraftHost>')).toBeGreaterThan(text.indexOf('</SiteFrame>'));
		const draft = scoped().find((file) => file.path.endsWith('booking-draft.svelte.ts'));
		expect(draft?.text).toContain("createContext<BookingDraft>('BookingDraft')");
	});

	it('(negative) the scan finds a way out, a singleton (a rune state, a draft or any mutable at the top, a `<script module>`), the history, the address, another window, a browser cache and an unmarked read when they are planted — security web MINOR-1', () => {
		const planted = (path: string, text: string): SourceFile => ({
			path,
			text: stripComments(text)
		});
		expect(
			findings([
				planted(
					'src/modules/doctor-onboarding/ui/steps/hooks/use-basic.svelte.ts',
					"export const memory = $state({});\nsessionStorage.setItem('dob', value);\nconsole.log(value);"
				),
				planted(
					'src/modules/doctor-onboarding/ui/steps/page/office.svelte',
					'<p>{@html gettingThere}</p>'
				),
				planted(
					'src/modules/doctor-onboarding/api/progress/index.ts',
					'export const progressQuery = () => ({ queryKey: [], queryFn: read });'
				),
				planted(
					'src/modules/doctor-onboarding/ui/draft-host/hooks/ok.svelte.ts',
					'class A {\n\tedits = $state({});\n}\nfunction b() {\n\tlet c = $state(0);\n\tconst d = new OnboardingDraft();\n}'
				),
				planted(
					'src/modules/doctor-onboarding/ui/steps/hooks/use-shared.svelte.ts',
					'export const draft = new OnboardingDraft();'
				),
				planted(
					'src/modules/appointments/ui/booking/page/index.svelte',
					'<script lang="ts" module>\n\tlet memory = $state({});\n\texport const shared = new BookingDraft();\n</script>\n<script lang="ts">\n\tlet own = $state(0);\n</script>'
				),
				planted(
					'src/modules/appointments/ui/booking/hooks/use-review.svelte.ts',
					'client.setQueryData(appointmentsQueryKeys.detail(id), appointment);'
				),
				planted(
					'src/modules/appointments/ui/booking/hooks/use-marked.svelte.ts',
					'client.setQueryDefaults(appointmentsQueryKeys.all, { meta: personalQueryMeta });\nclient.setQueryData(key, value);'
				),
				// Security web MINOR-1 (α): a singleton of a module that is no rune and no draft.
				planted(
					'src/modules/appointments/lib/booking/note/index.ts',
					"let lastNote = '';\nexport const lastNotes = new Map();\nexport function keep(note: string) {\n\tlet local = note;\n\tlastNote = local;\n}"
				),
				// (β) the history, the address, another window, the browser's cache.
				planted(
					'src/modules/appointments/ui/booking/hooks/use-history.svelte.ts',
					"history.pushState({ note }, '');\nreplaceState(page.url, { note });"
				),
				planted(
					'src/modules/appointments/ui/booking/page/name.svelte',
					'<script lang="ts">\n\tvoid goto(`/doctors/x/booking?note=${note}`);\n\tconst q = new URLSearchParams({ firstName });\n</script>'
				),
				planted(
					'src/modules/doctor-onboarding/ui/steps/page/basic.svelte',
					"<script lang=\"ts\">\n\twindow.name = firstName;\n\tnew BroadcastChannel('x').postMessage(dateOfBirth);\n\tvoid caches.open('x');\n</script>"
				),
				// (γ) the routes and the history's reader are in the scope now.
				planted('src/routes/doctors/[slug]/booking/+layout.server.ts', 'console.log(cookies);'),
				planted(
					'src/shared/lib/navigation/stored-page-state.ts',
					"sessionStorage.getItem('depth');"
				),
				// (δ) a read outside `api/`, without the mark.
				planted(
					'src/modules/doctor-onboarding/ui/steps/page/office.svelte',
					'<script lang="ts">\n\tvoid client.fetchQuery({ queryKey: [], queryFn: read });\n</script>'
				),
				// … and what the rules allow: the hints' own writer, a `let` inside a function, a `goto` with `replaceState: true`.
				planted(
					'src/modules/appointments/lib/booking/url/index.ts',
					"export function hints() {\n\tconst search = new URLSearchParams();\n\tsearch.set('office', id);\n\tlet i = 0;\n\treturn `?appointment=${id}`;\n}"
				),
				planted(
					'src/modules/appointments/ui/booking/hooks/use-navigation.svelte.ts',
					'void goto(path, { replaceState: true, noScroll: true, keepFocus: true, state: page.state });'
				)
			])
		).toEqual([
			'src/modules/doctor-onboarding/ui/steps/hooks/use-basic.svelte.ts: a storage',
			'src/modules/doctor-onboarding/ui/steps/hooks/use-basic.svelte.ts: a log',
			'src/modules/doctor-onboarding/ui/steps/hooks/use-basic.svelte.ts: a persisted cache',
			"src/modules/doctor-onboarding/ui/steps/hooks/use-basic.svelte.ts: rune state at the module's top level",
			'src/modules/doctor-onboarding/ui/steps/page/office.svelte: raw HTML',
			"src/modules/doctor-onboarding/api/progress/index.ts: a read without the sign-out's mark",
			"src/modules/doctor-onboarding/ui/steps/hooks/use-shared.svelte.ts: a draft at the module's top level",
			'src/modules/appointments/ui/booking/page/index.svelte: rune state in <script module>',
			'src/modules/appointments/ui/booking/page/index.svelte: a draft in <script module>',
			'src/modules/appointments/ui/booking/page/index.svelte: mutable state in <script module>',
			"src/modules/appointments/ui/booking/hooks/use-review.svelte.ts: a cache write without the sign-out's mark",
			"src/modules/appointments/lib/booking/note/index.ts: mutable state at the module's top level",
			'src/modules/appointments/ui/booking/hooks/use-history.svelte.ts: a history entry',
			"src/modules/appointments/ui/booking/page/name.svelte: an address's search written",
			'src/modules/doctor-onboarding/ui/steps/page/basic.svelte: another window',
			'src/modules/doctor-onboarding/ui/steps/page/basic.svelte: a browser cache',
			'src/routes/doctors/[slug]/booking/+layout.server.ts: a log',
			'src/shared/lib/navigation/stored-page-state.ts: a storage',
			"src/modules/doctor-onboarding/ui/steps/page/office.svelte: a read without the sign-out's mark"
		]);
	});
	it('🔴 U-65.6 (web) · D-W4-63 (negative, planted — one per new folder of wave 4.0): a relative’s name in an address, an hour in a storage, a note in a log, a review’s words as HTML, an unmarked read or cache write on the patient’s pages — each is reported', () => {
		const planted = (path: string, text: string): SourceFile => ({
			path,
			text: stripComments(text)
		});
		// Only what the SCOPE names is scanned, as the guard itself reads the tree (`scoped()`).
		const inScope = (files: SourceFile[]) => files.filter((file) => SCOPE.test(file.path));
		expect(
			findings(
				inScope([
					planted(
						'src/screens/appointments/[...path]/page/index.svelte',
						'<script lang="ts">\n\tvoid goto(`/appointments/${id}?was=${oldHour}`);\n</script>'
					),
					planted(
						'src/screens/appointments/[...path]/hooks/use-screen.svelte.ts',
						"sessionStorage.setItem('note', appointment.patientNote);"
					),
					planted(
						'src/screens/ratings/[invitationId]/page/index.svelte',
						'<p>{@html draft.body}</p>'
					),
					planted(
						'src/screens/ratings/[invitationId]/hooks/use-screen.svelte.ts',
						'client.setQueryData(key, review);'
					),
					planted(
						'src/screens/profile/[...path]/page/index.svelte',
						'<script lang="ts">\n\tvoid goto(`/profile/relatives?done=del&name=${relative.firstName}`);\n</script>'
					),
					planted(
						'src/screens/profile/[...path]/hooks/use-screen.svelte.ts',
						'const read = createQuery(() => ({ queryKey: [], queryFn: readUpcoming }));'
					),
					planted(
						'src/routes/appointments/[...path]/+page.ts',
						'console.log(params.path, url.searchParams);'
					),
					planted(
						'src/routes/ratings/[invitationId]/+page.ts',
						"url.searchParams.set('name', patientName);"
					),
					planted('src/routes/profile/[...path]/+page.ts', "let lastRelative = '';"),
					planted(
						'src/modules/doctor/ui/public-profiles/hooks/use-public-profiles.svelte.ts',
						"localStorage.setItem('doctors', ids.join());\nconst read = { queryKey: [], queryFn: readDoctor };"
					),
					planted(
						'src/modules/profile/lib/paths/index.ts',
						'export const relativeDonePath = (name: string) => `/profile/relatives?done=del&name=${name}`;'
					),
					// … and what the rules allow there: an id in a path, a fixed word in the search, `replaceState: true`.
					planted(
						'src/screens/profile/[...path]/hooks/use-screen.svelte.ts',
						'const editHref = (id: string) => href(`/profile/relatives/${id}`);\nvoid goto(list, { replaceState: true });'
					),
					planted(
						'src/modules/appointments/lib/paths/index.ts',
						"export const APPOINTMENTS_HISTORY_SEARCH = '?tab=history';"
					),
					// … and a page outside the scope is not this guard's.
					planted('src/screens/help/page/index.svelte', '<p>{@html answer}</p>')
				])
			)
		).toEqual([
			"src/screens/appointments/[...path]/page/index.svelte: an address's search written",
			'src/screens/appointments/[...path]/hooks/use-screen.svelte.ts: a storage',
			'src/screens/appointments/[...path]/hooks/use-screen.svelte.ts: a persisted cache',
			'src/screens/ratings/[invitationId]/page/index.svelte: raw HTML',
			"src/screens/ratings/[invitationId]/hooks/use-screen.svelte.ts: a cache write without the sign-out's mark",
			"src/screens/profile/[...path]/page/index.svelte: an address's search written",
			"src/screens/profile/[...path]/hooks/use-screen.svelte.ts: a read without the sign-out's mark",
			'src/routes/appointments/[...path]/+page.ts: a log',
			"src/routes/ratings/[invitationId]/+page.ts: an address's search written",
			"src/routes/profile/[...path]/+page.ts: mutable state at the module's top level",
			'src/modules/doctor/ui/public-profiles/hooks/use-public-profiles.svelte.ts: a storage',
			'src/modules/doctor/ui/public-profiles/hooks/use-public-profiles.svelte.ts: a persisted cache',
			"src/modules/doctor/ui/public-profiles/hooks/use-public-profiles.svelte.ts: a read without the sign-out's mark",
			"src/modules/profile/lib/paths/index.ts: an address's search written"
		]);
	});

	/**
	 * Review w3-w6 R1 NIT-3: each branch of each rule alone, in a file of its own — one broken alternative of a pattern
	 * turns its row red, where the planted files above (2–3 patterns in one file, compared by file and reason) would not.
	 */
	const TS = 'src/modules/appointments/lib/booking/note/index.ts';
	const RUNES = 'src/modules/doctor-onboarding/ui/steps/hooks/use-basic.svelte.ts';
	const PAGE = 'src/modules/appointments/ui/booking/page/name.svelte';
	const OWN = 'src/modules/doctor-onboarding/api/progress/index.ts';
	const BRANCHES: [path: string, text: string, reason: string][] = [
		[TS, "localStorage.getItem('k');", 'a storage'],
		[TS, "sessionStorage.getItem('k');", 'a storage'],
		[TS, "indexedDB.open('k');", 'a storage'],
		[TS, 'document.cookie;', 'a cookie'],
		[TS, 'console.info(value);', 'a log'],
		[TS, "navigator.sendBeacon('/x', value);", 'analytics'],
		[TS, "gtag('event', value);", 'analytics'],
		[TS, 'dataLayer.length;', 'analytics'],
		[TS, 'Analytics.track(value);', 'analytics'],
		[TS, 'persistQueryClient(options);', 'a persisted cache'],
		[TS, "store.setItem('k', value);", 'a persisted cache'],
		[PAGE, '<p>{@html value}</p>', 'raw HTML'],
		[TS, 'node.innerHTML;', 'raw HTML'],
		[TS, "node.insertAdjacentHTML('beforeend', value);", 'raw HTML'],
		[TS, "history.pushState({ value }, '');", 'a history entry'],
		[TS, 'replaceState(page.url, { value });', 'a history entry'],
		[TS, "parent.postMessage(value, '*');", 'another window'],
		[TS, "new BroadcastChannel('x');", 'another window'],
		[TS, 'window.name = value;', 'another window'],
		[TS, "void caches.open('x');", 'a browser cache'],
		[TS, "void window.caches.open('x');", 'a browser cache'],
		[TS, 'void CacheStorage;', 'a browser cache'],
		[TS, 'void new URLSearchParams({ value });', "an address's search written"],
		[TS, "url.searchParams.set('k', value);", "an address's search written"],
		[TS, "url.searchParams.append('k', value);", "an address's search written"],
		[TS, 'void goto(`/x?note=${value}`);', "an address's search written"],
		[TS, 'void goto(`/x?a=1&note=${value}`);', "an address's search written"],
		[TS, "let last = '';", "mutable state at the module's top level"],
		[TS, "var last = '';", "mutable state at the module's top level"],
		[TS, 'export const kept = new Map();', "mutable state at the module's top level"],
		[TS, 'const kept: Map<string, string> = new Map();', "mutable state at the module's top level"],
		[TS, 'const kept = new Set();', "mutable state at the module's top level"],
		[TS, 'const kept = new WeakMap();', "mutable state at the module's top level"],
		[TS, 'const kept = new WeakSet();', "mutable state at the module's top level"],
		[TS, 'const kept = new Array();', "mutable state at the module's top level"],
		[TS, 'const kept = new Object();', "mutable state at the module's top level"],
		[RUNES, 'export const kept = $state({});', "rune state at the module's top level"],
		[
			RUNES,
			'const kept: { a: number } = $state({ a: 0 });',
			"rune state at the module's top level"
		],
		[TS, 'export const draft = new OnboardingDraft();', "a draft at the module's top level"],
		[TS, 'const draft = new BookingDraft();', "a draft at the module's top level"],
		[
			PAGE,
			'<script lang="ts" module>\n\tconst kept = $state({});\n</script>',
			'rune state in <script module>'
		],
		[
			PAGE,
			'<script lang="ts" module>\n\tconst draft = new BookingDraft();\n</script>',
			'a draft in <script module>'
		],
		[
			PAGE,
			'<script lang="ts" module>\n\tconst kept = new Map();\n</script>',
			'mutable state in <script module>'
		],
		[
			PAGE,
			'<script context="module">\n\tconst kept = new Set();\n</script>',
			'mutable state in <script module>'
		],
		[TS, 'client.setQueryData(key, value);', "a cache write without the sign-out's mark"],
		[
			OWN,
			'export const read = () => ({ queryKey: [], queryFn: get });',
			"a read without the sign-out's mark"
		]
	];

	it.each(BRANCHES)('(negative, NIT-3) %s · `%s` alone ⇒ %s', (path, text, reason) => {
		expect(findings([{ path, text: stripComments(text) }])).toEqual([`${path}: ${reason}`]);
	});
});

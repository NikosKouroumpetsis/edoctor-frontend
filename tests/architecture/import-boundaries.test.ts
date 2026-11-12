import { existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectRoot, readSourceFiles, stripComments, type SourceFile } from './source-scan';

/**
 * 🔴 U-29.3 (the owner's «3 tests-φρουροί»): the dependency direction of `architecture-pattern.md` — routes ⇒ screens ⇒
 * modules ⇒ shared — read from every import of `src/` (specs excluded):
 * - `src/shared` imports no module, screen or route;
 * - a module imports no other module, no screen and no route; a screen no other screen and no route;
 * - a slice's private files (`components/ hooks/ lib/ page/`) and a screen's are imported only from inside it: every
 *   other file takes the public API (`index.ts`);
 * - a relative import never leaves its unit (the slice, the segment folder, the screen; MINOR-3): an alias does;
 * - no `$lib`, no `export *`, and `$generated/api` only inside `src/shared/lib/api-client`.
 */
type Import = { line: number; spec: string };

const IMPORT =
	/(?:\bimport\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?|\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+|\bimport\s*\(\s*)['"]([^'"]+)['"]/gu;

function importsOf(file: SourceFile): Import[] {
	return [...file.text.matchAll(IMPORT)].map((match) => ({
		spec: match[1],
		line: file.text.slice(0, match.index ?? 0).split('\n').length
	}));
}

const ALIASES: Record<string, string> = {
	$modules: 'src/modules',
	$shared: 'src/shared',
	$screens: 'src/screens',
	$generated: 'src/generated',
	$paraglide: 'src/generated/paraglide'
};

/** The repo path an import points at (`null` for a package, `$app`, `$env`, `./$types`). */
function targetOf(from: string, spec: string): string | null {
	if (spec.startsWith('.')) return posix.normalize(posix.join(posix.dirname(from), spec));
	const [head, ...rest] = spec.split('/');
	const base = ALIASES[head];
	return base ? [base, ...rest].join('/') : null;
}

const parts = (path: string) => path.split('/');
/** `search-doctors` for `src/modules/search-doctors/...`. */
const moduleOf = (path: string) => (path.startsWith('src/modules/') ? parts(path)[2] : null);
/** `src/modules/<f>/ui/<slice>` of a slice file. */
const sliceOf = (path: string) =>
	/^src\/modules\/[^/]+\/ui\/[^/]+\//u.test(path) ? parts(path).slice(0, 5).join('/') : null;

/** `src/screens/<route…>`: the folder of the screen a file belongs to (the one holding `page/`). */
function screenOf(path: string): string | null {
	if (!path.startsWith('src/screens/')) return null;
	const segments = parts(path);
	const at = segments.findIndex(
		(segment, index) =>
			index > 2 &&
			['page', 'hooks', 'components', 'lib', 'index', 'index.ts', 'types', 'types.ts'].includes(
				segment
			)
	);
	return at < 0 ? segments.join('/') : segments.slice(0, at).join('/');
}

/** The folder a relative import must stay in (the slice, the segment's folder, the screen, the module root). */
function unitOf(path: string): string | null {
	const slice = sliceOf(path);
	if (slice) return slice;
	const screen = screenOf(path);
	if (screen) return screen;
	if (!path.startsWith('src/modules/')) return null;
	const segments = parts(path);
	if (['api', 'lib', 'config'].includes(segments[3])) {
		return segments.length > 5 ? segments.slice(0, 5).join('/') : segments.slice(0, 4).join('/');
	}
	return segments.slice(0, 3).join('/');
}

const PRIVATE = ['components', 'hooks', 'lib', 'page'];

/** Π2 (U-30.1): the shared UI's atomic layers, lowest first; a layer never imports one above it. */
const ATOMIC = ['primitives', 'molecules', 'organisms', 'templates'];
const layerOf = (path: string) =>
	path.startsWith('src/shared/ui/') ? ATOMIC.indexOf(parts(path)[3]) : -1;
/** Stories and harnesses compose the kit for a demo or a test; the layers bind the kit itself. */
const isDemo = (path: string) => /\.(stories|harness|form-harness)\.svelte$/u.test(path);
const inside = (path: string, folder: string) => path === folder || path.startsWith(`${folder}/`);

function boundaryFindings(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		const at = (entry: Import, why: string) => `${file.path}:${entry.line} ${why} (${entry.spec})`;
		const findings: string[] = [];
		if (/\bexport\s+\*\s+from\b/u.test(file.text)) findings.push(`${file.path} export *`);
		for (const entry of importsOf(file)) {
			if (entry.spec === '$lib' || entry.spec.startsWith('$lib/')) {
				findings.push(at(entry, '$lib'));
				continue;
			}
			const target = targetOf(file.path, entry.spec);
			if (!target) continue;
			if (inside(target, 'src/generated/api') && !inside(file.path, 'src/shared/lib/api-client')) {
				findings.push(at(entry, '$generated/api outside the api client'));
			}
			const fromShared = inside(file.path, 'src/shared');
			const fromModule = moduleOf(file.path);
			const fromScreen = screenOf(file.path);
			if (fromShared && /^src\/(modules|screens|routes)\//u.test(target)) {
				findings.push(at(entry, 'shared → feature'));
			}
			if (fromModule) {
				const toModule = moduleOf(target);
				if (toModule && toModule !== fromModule) findings.push(at(entry, 'module → module'));
				if (/^src\/(screens|routes)\//u.test(target))
					findings.push(at(entry, 'module → page layer'));
			}
			if (fromScreen) {
				if (inside(target, 'src/routes')) findings.push(at(entry, 'screen → route'));
				const toScreen = screenOf(target);
				if (toScreen && toScreen !== fromScreen) findings.push(at(entry, 'screen → screen'));
			}
			// A private file of a slice or a screen, from outside it.
			const slice = sliceOf(target);
			if (slice && PRIVATE.includes(parts(target)[5]) && !inside(file.path, slice)) {
				findings.push(at(entry, 'private file of a slice'));
			}
			const screen = screenOf(target);
			if (
				screen &&
				PRIVATE.includes(parts(target)[parts(screen).length]) &&
				!inside(file.path, screen)
			) {
				findings.push(at(entry, 'private file of a screen'));
			}
			const from = layerOf(file.path);
			const to = layerOf(target);
			if (from >= 0 && to > from && !isDemo(file.path)) {
				findings.push(at(entry, `${ATOMIC[from]} → ${ATOMIC[to]}`));
			}
			// MINOR-3: a relative import stays in its unit.
			const unit = unitOf(file.path);
			if (
				entry.spec.startsWith('.') &&
				unit &&
				!inside(target, unit) &&
				!inside(target, 'vitest-mocks')
			) {
				findings.push(at(entry, 'relative import out of its unit'));
			}
		}
		return findings;
	});
}

const planted = (path: string, text: string): SourceFile => ({ path, text: stripComments(text) });

describe('import boundaries (U-29.3)', () => {
	it('U-29.3: routes ⇒ screens ⇒ modules ⇒ shared — no import against the direction, no private file, no `$lib`, no `export *`', () => {
		const files = readSourceFiles().filter((file) => !file.path.endsWith('.css'));
		// The scan read the code: the layers and their imports.
		expect(files.filter((file) => file.path.startsWith('src/modules/')).length).toBeGreaterThan(
			100
		);
		expect(files.filter((file) => file.path.startsWith('src/shared/')).length).toBeGreaterThan(300);
		expect(files.flatMap(importsOf).length).toBeGreaterThan(2000);
		expect(boundaryFindings(files)).toEqual([]);
	});

	it('U-29.3: the units a relative import stays in — the slice, the segment folder, the screen', () => {
		expect(unitOf('src/modules/shell/ui/site-frame/components/legal-line.svelte')).toBe(
			'src/modules/shell/ui/site-frame'
		);
		expect(unitOf('src/modules/search-doctors/api/marketplace/endpoints.ts')).toBe(
			'src/modules/search-doctors/api/marketplace'
		);
		expect(unitOf('src/modules/shell/lib/consent.ts')).toBe('src/modules/shell/lib');
		expect(unitOf('src/screens/legal/[slug]/page/index.svelte')).toBe('src/screens/legal/[slug]');
		expect(existsSync(join(projectRoot, 'src/screens/legal/[slug]/page/index.svelte'))).toBe(true);
	});

	it('U-29.3 (negative): each crossing is reported — shared → module, module → module, a private file, a deep relative path, `$lib`, `export *`, `$generated/api`, an atomic layer upward (Π2)', () => {
		const files = [
			planted(
				'src/shared/ui/molecules/x/x.svelte',
				"<script>import A from '$modules/shell/ui/site-frame';</script>"
			),
			planted('src/shared/lib/y/index.ts', "import { b } from '../../../screens/home';"),
			planted(
				'src/modules/articles/ui/home-row/page/index.svelte',
				"<script>import { c } from '$modules/shell/lib/consent';</script>"
			),
			planted(
				'src/modules/shell/ui/site-frame/page/index.svelte',
				"<script>import D from '$modules/shell/ui/consent-prompt/components/tools-dialog.svelte';</script>"
			),
			planted(
				'src/modules/shell/ui/consent-prompt/page/index.svelte',
				"<script>import { e } from '../../../lib/consent';</script>"
			),
			planted(
				'src/screens/help/page/index.svelte',
				"<script>import F from '$screens/home/page/index.svelte';</script>"
			),
			planted(
				'src/modules/shell/lib/z.ts',
				"import { g } from '$lib/utils';\nexport * from './consent';"
			),
			planted('src/modules/shell/api/w.ts', "import type { H } from '$generated/api';"),
			planted(
				'src/modules/shell/ui/site-frame/lib/frame.ts',
				"// import X from '$modules/articles/api';\nimport { legalPath } from '$modules/shell/lib/legal';"
			),
			planted(
				'src/shared/ui/molecules/date-strip/date-strip.svelte',
				"<script>import { railControlsClasses } from '$shared/ui/organisms/rail';</script>"
			),
			planted(
				'src/shared/ui/primitives/chip/chip.stories.svelte',
				"<script>import { ChipGroup } from '$shared/ui/molecules/chip-group';</script>"
			),
			planted(
				'src/shared/ui/organisms/rail/rail.svelte',
				"<script>import { IconButton } from '$shared/ui/primitives/icon-button';</script>"
			)
		];
		expect(boundaryFindings(files)).toEqual([
			'src/shared/ui/molecules/x/x.svelte:1 shared → feature ($modules/shell/ui/site-frame)',
			'src/shared/lib/y/index.ts:1 shared → feature (../../../screens/home)',
			'src/modules/articles/ui/home-row/page/index.svelte:1 module → module ($modules/shell/lib/consent)',
			'src/modules/shell/ui/site-frame/page/index.svelte:1 private file of a slice ($modules/shell/ui/consent-prompt/components/tools-dialog.svelte)',
			'src/modules/shell/ui/consent-prompt/page/index.svelte:1 relative import out of its unit (../../../lib/consent)',
			'src/screens/help/page/index.svelte:1 screen → screen ($screens/home/page/index.svelte)',
			'src/screens/help/page/index.svelte:1 private file of a screen ($screens/home/page/index.svelte)',
			'src/modules/shell/lib/z.ts export *',
			'src/modules/shell/lib/z.ts:1 $lib ($lib/utils)',
			'src/modules/shell/api/w.ts:1 $generated/api outside the api client ($generated/api)',
			'src/shared/ui/molecules/date-strip/date-strip.svelte:1 molecules → organisms ($shared/ui/organisms/rail)'
		]);
	});
});

/**
 * W-4 (card w3-w6: «τα wire types μένουν στο `api/`· στα modules φτάνουν μόνο facts»): in the two modules of wave 3 and
 * their screens and routes, only `api/` imports the generated contract (`$shared/lib/api-client`); everything else meets
 * the facts and the bodies `api/` names. Wave 4.0 (review w4-arch-frontend N-1, card w4-w9): the patient's pages too —
 * the screens and the routes of `/appointments`, `/ratings` and `/profile`.
 */
const WAVE_3 =
	/^src\/(modules\/(appointments|doctor-onboarding)|screens\/doctor\/onboarding|screens\/doctors\/\[slug\]\/booking|routes\/doctor\/onboarding|routes\/doctors\/\[slug\]\/booking|(screens|routes)\/(appointments|ratings|profile))\//u;
/** The generated contract's door, and every path under it (review w3-w6 R1 MINOR-1: `…/api-client/wire-types` too). */
const API_CLIENT = /^\$shared\/lib\/api-client(?:\/|$)/u;
function wireFindings(files: SourceFile[]): string[] {
	return files.flatMap((file) =>
		WAVE_3.test(file.path) && !/^src\/modules\/[^/]+\/api\//u.test(file.path)
			? importsOf(file)
					.filter((entry) => API_CLIENT.test(entry.spec))
					.map((entry) => `${file.path}:${entry.line} wire type outside api/`)
			: []
	);
}

describe('W-4: the wire types stay in `api/` (appointments, doctor-onboarding)', () => {
	it('W-4: no `lib/`, `ui/`, screen or route of the booking or the sign-up imports the generated contract', () => {
		const files = readSourceFiles().filter((file) => WAVE_3.test(file.path));
		expect(files.filter((file) => file.path.includes('/api/')).length).toBeGreaterThan(40);
		// Wave 4.0: the scan reads the patient's pages it names.
		const paths = files.map((file) => file.path);
		for (const path of [
			'src/screens/appointments/[...path]/page/index.svelte',
			'src/screens/appointments/[...path]/hooks/use-time.svelte.ts',
			'src/screens/ratings/[invitationId]/page/index.svelte',
			'src/screens/profile/[...path]/page/index.svelte',
			'src/routes/appointments/[...path]/+page.ts',
			'src/routes/ratings/[invitationId]/+page.ts',
			'src/routes/profile/[...path]/+page.ts'
		]) {
			expect(paths, path).toContain(path);
		}
		expect(wireFindings(files)).toEqual([]);
	});

	it('W-4 (negative): a wire type planted in a lib or a page is reported; in `api/` it is the rule', () => {
		expect(
			wireFindings([
				planted(
					'src/modules/appointments/lib/relatives/form/index.ts',
					"import type { RelativeView } from '$shared/lib/api-client';"
				),
				planted(
					'src/modules/doctor-onboarding/ui/steps/page/office.svelte',
					'<script lang="ts">import type { ApiRequestBody } from \'$shared/lib/api-client\';</script>'
				),
				planted(
					'src/modules/doctor-onboarding/api/progress/endpoints.ts',
					"import type { DoctorOnboardingProgressView } from '$shared/lib/api-client';"
				),
				// Review w3-w6 R1 MINOR-1: the deep path is the same door.
				planted(
					'src/modules/appointments/ui/booking/page/relative.svelte',
					'<script lang="ts">import type { RelativeView } from \'$shared/lib/api-client/wire-types\';</script>'
				),
				// … and a name that only starts the same is another module.
				planted(
					'src/modules/appointments/lib/booking/url/index.ts',
					"import { x } from '$shared/lib/api-clients';"
				),
				// Wave 4.0 (N-1): one per new folder of the patient's pages — a screen, its hook, a route.
				planted(
					'src/screens/appointments/[...path]/page/index.svelte',
					'<script lang="ts">import type { AppointmentResponseView } from \'$shared/lib/api-client\';</script>'
				),
				planted(
					'src/screens/ratings/[invitationId]/hooks/use-screen.svelte.ts',
					"import type { RatingInvitationView } from '$shared/lib/api-client';"
				),
				planted(
					'src/screens/profile/[...path]/hooks/use-screen.svelte.ts',
					"import type { RelativeView } from '$shared/lib/api-client/wire-types';"
				),
				planted(
					'src/routes/appointments/[...path]/+page.ts',
					"import type { ApiRequestBody } from '$shared/lib/api-client';"
				),
				planted(
					'src/routes/ratings/[invitationId]/+page.ts',
					"import type { ApiRequestBody } from '$shared/lib/api-client';"
				),
				planted(
					'src/routes/profile/[...path]/+page.ts',
					"import type { ApiRequestBody } from '$shared/lib/api-client';"
				),
				// … and a screen of another feature is not this rule's.
				planted(
					'src/screens/favorites/page/index.svelte',
					'<script lang="ts">import type { FavoriteView } from \'$shared/lib/api-client\';</script>'
				)
			])
		).toEqual([
			'src/modules/appointments/lib/relatives/form/index.ts:1 wire type outside api/',
			'src/modules/doctor-onboarding/ui/steps/page/office.svelte:1 wire type outside api/',
			'src/modules/appointments/ui/booking/page/relative.svelte:1 wire type outside api/',
			'src/screens/appointments/[...path]/page/index.svelte:1 wire type outside api/',
			'src/screens/ratings/[invitationId]/hooks/use-screen.svelte.ts:1 wire type outside api/',
			'src/screens/profile/[...path]/hooks/use-screen.svelte.ts:1 wire type outside api/',
			'src/routes/appointments/[...path]/+page.ts:1 wire type outside api/',
			'src/routes/ratings/[invitationId]/+page.ts:1 wire type outside api/',
			'src/routes/profile/[...path]/+page.ts:1 wire type outside api/'
		]);
	});
});

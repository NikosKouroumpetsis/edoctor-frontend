import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectRoot, readSourceFiles, stripComments, type SourceFile } from './source-scan';

/**
 * 🔴 U-29.1 (the owner, 29/10: «Ναι, όπως η app»): a module of the web has the application's fixed segments
 * `api/ lib/ config/ ui/` and a type-only `types.ts` — `lib/` pure (no runes), `config/` static data, `api/` the
 * backend's facts that never read `lib/`. And U-29.3 (BLOCKER-1 of the audit): remote answers live in TanStack Query,
 * never in runes — no rune state typed with an `api/` answer, no transport called from a runes file outside a query.
 */
const SEGMENTS = ['api', 'config', 'lib', 'types.ts', 'ui'];
const RUNE = /\$(state|derived|effect|props|bindable|inspect|host)\b/u;

/**
 * U-29.1, listed with their reason (an entry that no longer matches fails): the `api/` files that still read `lib/`.
 * 🔴 U-32.1 (the owner, 29/10, «Ναι σε όλα»): none — the api answers the cards' facts and the libs write them, as the
 * application (the six former entries: the card adapter, the rows' query, the home's and the articles' loads, the
 * results' load and prefetch). A new import of `lib/` in `api/` fails; so would an entry left here.
 */
const API_READS_LIB: Record<string, string> = {};

type Entry = { path: string; isDirectory: boolean };

/** Every entry at the root of each `src/modules/<feature>/`. */
function moduleRoots(): Entry[] {
	const base = join(projectRoot, 'src/modules');
	return readdirSync(base)
		.filter((feature) => statSync(join(base, feature)).isDirectory())
		.flatMap((feature) =>
			readdirSync(join(base, feature)).map((entry) => ({
				path: `src/modules/${feature}/${entry}`,
				isDirectory: statSync(join(base, feature, entry)).isDirectory()
			}))
		);
}

const segmentOf = (path: string) => path.split('/')[3];
const isLibFile = (path: string) =>
	/^src\/modules\/[^/]+\/lib\//u.test(path) || /^src\/modules\/[^/]+\/ui\/[^/]+\/lib\//u.test(path);
const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length;

function segmentFindings(roots: Entry[], files: SourceFile[]): string[] {
	const findings: string[] = [];
	for (const entry of roots) {
		const name = entry.path.split('/')[3];
		const expected = name === 'types.ts' ? !entry.isDirectory : entry.isDirectory;
		if (!SEGMENTS.includes(name) || !expected) findings.push(`${entry.path}: not a segment`);
	}
	for (const file of files) {
		const segment = segmentOf(file.path);
		const runeFree = isLibFile(file.path) || ['api', 'config'].includes(segment);
		if (file.path.startsWith('src/modules/') && runeFree) {
			if (/\.svelte(\.ts)?$/u.test(file.path)) {
				findings.push(`${file.path}: a Svelte file in ${isLibFile(file.path) ? 'lib' : segment}/`);
			}
			const where = isLibFile(file.path) ? 'lib' : segment;
			const rune = RUNE.exec(file.text);
			if (rune) findings.push(`${file.path}:${lineOf(file.text, rune.index)} rune in ${where}/`);
		}
		if (file.path.startsWith('src/modules/') && segment === 'config') {
			for (const match of file.text.matchAll(/\bfunction\b|=>/gu)) {
				findings.push(`${file.path}:${lineOf(file.text, match.index ?? 0)} computed in config/`);
			}
			for (const match of file.text.matchAll(/\bimport\s+(?!type\b)/gu)) {
				findings.push(
					`${file.path}:${lineOf(file.text, match.index ?? 0)} a value import in config/`
				);
			}
		}
		if (file.path.endsWith('/types.ts')) {
			file.text.split('\n').forEach((line, index) => {
				if (
					line.trim() &&
					!/^\s/u.test(line) &&
					!/^(import type |export type |export interface |type |interface |[}\])>|&])/u.test(line)
				) {
					findings.push(`${file.path}:${index + 1} runtime code in types.ts`);
				}
			});
		}
	}
	return findings;
}

/** U-29.1: `api/` never imports `lib/` (the listed exceptions aside); a listed file that no longer does is stale. */
function apiReadsLibFindings(files: SourceFile[], allowed: Record<string, string>): string[] {
	const reading = files
		.filter((file) => segmentOf(file.path) === 'api' && file.path.startsWith('src/modules/'))
		.filter((file) => /from\s+['"](\$modules\/[^/'"]+\/lib\/|(\.\.\/)+lib\/)/u.test(file.text))
		.map((file) => file.path);
	return [
		...reading.filter((path) => !(path in allowed)).map((path) => `${path}: api/ reads lib/`),
		...Object.keys(allowed)
			.filter((path) => !reading.includes(path))
			.map((path) => `${path}: a stale exception`)
	];
}

/** Every name an `api/` import of a file brings, split into types and values. */
function apiImportsOf(file: SourceFile): { types: string[]; values: string[] } {
	const types: string[] = [];
	const values: string[] = [];
	const imports =
		/import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"](\$modules\/[^/'"]+\/api\/[^'"]*|(\.\.\/)+api\/[^'"]*)['"]/gu;
	for (const match of file.text.matchAll(imports)) {
		for (const raw of match[2].split(',')) {
			const name = raw.trim().replace(/\s+as\s+\w+$/u, '');
			if (!name) continue;
			if (match[1] || name.startsWith('type ')) types.push(name.replace(/^type\s+/u, ''));
			else values.push(name);
		}
	}
	return { types, values };
}

/** U-29.3: in a runes file of the features, no rune state typed with an `api/` answer and no transport out of a query. */
function runesApiFindings(files: SourceFile[]): string[] {
	return files
		.filter((file) => /^src\/(modules|screens)\//u.test(file.path))
		.filter((file) => /\.svelte(\.ts)?$/u.test(file.path))
		.flatMap((file) => {
			const { types, values } = apiImportsOf(file);
			const findings: string[] = [];
			for (const match of file.text.matchAll(/\$state(?:\.raw)?\s*<([^=;]*)>\s*\(/gu)) {
				const typed = types.filter((name) => new RegExp(`\\b${name}\\b`, 'u').test(match[1]));
				if (typed.length) {
					findings.push(
						`${file.path}:${lineOf(file.text, match.index ?? 0)} rune state holds ${typed.join(', ')}`
					);
				}
			}
			// The transport: endpoints, sources and resolvers (`searchDoctors`, `fetchHomeSection`, `getFacets`,
			// `resolveCategoryScope`), never a query's options or keys (`searchResultsInfiniteQuery`).
			const transports = values.filter(
				(name) =>
					/^(fetch|get|search|resolve)[A-Z]/u.test(name) &&
					!/(Query|Queries|Keys|Options)$/u.test(name)
			);
			const lines = file.text.split('\n');
			for (const name of transports) {
				for (const match of file.text.matchAll(new RegExp(`\\b${name}\\s*\\(`, 'gu'))) {
					const line = lineOf(file.text, match.index ?? 0);
					const context = lines.slice(Math.max(0, line - 2), line).join('\n');
					if (!/\bqueryFn\b/u.test(context)) {
						findings.push(`${file.path}:${line} ${name}() outside a query`);
					}
				}
			}
			return findings;
		});
}

const planted = (path: string, text: string): SourceFile => ({ path, text: stripComments(text) });

describe('the modules’ segments (U-29.1) and the remote answers (U-29.3)', () => {
	it('U-29.1: a module root holds only `api/ lib/ config/ ui/` and `types.ts`; `lib/` has no runes, `config/` is static, `types.ts` only types', () => {
		const roots = moduleRoots();
		const files = readSourceFiles();
		expect(roots.map((entry) => entry.path)).toEqual(
			expect.arrayContaining(['src/modules/search-doctors/lib', 'src/modules/shell/config'])
		);
		expect(files.filter((file) => isLibFile(file.path)).length).toBeGreaterThan(20);
		expect(files.filter((file) => file.path.endsWith('/types.ts')).length).toBeGreaterThan(20);
		expect(segmentFindings(roots, files)).toEqual([]);
	});

	it('U-29.1: `api/` never reads `lib/` — the listed files aside, each with its reason; a stale entry fails', () => {
		expect(apiReadsLibFindings(readSourceFiles(), API_READS_LIB)).toEqual([]);
		for (const reason of Object.values(API_READS_LIB)) expect(reason.length).toBeGreaterThan(20);
	});

	it('U-32.1: no `api/` file reads `lib/` — the exceptions’ list is empty, a type import counts as much as a value', () => {
		const files = readSourceFiles();
		expect(Object.keys(API_READS_LIB)).toEqual([]);
		expect(
			files.filter((file) => segmentOf(file.path) === 'api' && file.path.startsWith('src/modules/'))
				.length
		).toBeGreaterThan(20);
		expect(apiReadsLibFindings(files, {})).toEqual([]);
	});

	it('U-32.1 (negative): the former shapes are reported — a type of `lib/` in the home’s load, the card’s words in the adapter', () => {
		const files = [
			planted(
				'src/modules/search-doctors/api/home/load.ts',
				"import type { SearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';"
			),
			planted(
				'src/modules/search-doctors/api/marketplace/card-adapter.ts',
				"import {\n\tbuildFee,\n\tformatRatingLabel\n} from '$modules/search-doctors/lib/doctor-card';"
			),
			planted(
				'src/modules/search-doctors/api/marketplace/search-source.ts',
				"import type { SearchDoctorsCardFacts } from './types';"
			)
		];
		expect(apiReadsLibFindings(files, {})).toEqual([
			'src/modules/search-doctors/api/home/load.ts: api/ reads lib/',
			'src/modules/search-doctors/api/marketplace/card-adapter.ts: api/ reads lib/'
		]);
	});

	it('U-29.3: no rune state holds an `api/` answer, and a runes file calls the transport only inside a TanStack `queryFn`', () => {
		const files = readSourceFiles();
		const streamed = files.find((file) =>
			file.path.endsWith('discovery-home/hooks/use-streamed-sections.svelte.ts')
		);
		expect(streamed && apiImportsOf(streamed).values).toContain('fetchHomeSection');
		expect(runesApiFindings(files)).toEqual([]);
	});

	it('U-29.1 (negative): a folder out of the segments, runes in `lib/`, a function in `config/`, a value in `types.ts` — each is reported', () => {
		const roots: Entry[] = [
			{ path: 'src/modules/shell/ui', isDirectory: true },
			{ path: 'src/modules/shell/hooks', isDirectory: true },
			{ path: 'src/modules/shell/types.ts', isDirectory: false },
			{ path: 'src/modules/shell/helpers.ts', isDirectory: false }
		];
		const files = [
			planted('src/modules/shell/lib/memory.svelte.ts', 'let value = $state(0);'),
			planted('src/modules/shell/ui/site-frame/lib/frame.ts', 'export const x = $derived(1);'),
			planted(
				'src/modules/shell/config/legal.ts',
				"import { a } from '../lib/legal';\nexport const b = () => a;"
			),
			planted(
				'src/modules/shell/types.ts',
				'export type A = string;\nexport const B = 1;\n\tconst inner = 2;'
			),
			planted(
				'src/modules/shell/lib/ok.ts',
				'// $state is only named in a comment\nexport const ok = 1;'
			)
		];
		expect(segmentFindings(roots, files)).toEqual([
			'src/modules/shell/hooks: not a segment',
			'src/modules/shell/helpers.ts: not a segment',
			'src/modules/shell/lib/memory.svelte.ts: a Svelte file in lib/',
			'src/modules/shell/lib/memory.svelte.ts:1 rune in lib/',
			'src/modules/shell/ui/site-frame/lib/frame.ts:1 rune in lib/',
			'src/modules/shell/config/legal.ts:2 computed in config/',
			'src/modules/shell/config/legal.ts:1 a value import in config/',
			'src/modules/shell/types.ts:2 runtime code in types.ts'
		]);
	});

	it('U-29.1 (negative): an `api/` file that reads `lib/` is reported, and so is an exception left behind', () => {
		const files = [
			planted(
				'src/modules/shell/api/consent/map.ts',
				"import { x } from '$modules/shell/lib/consent';"
			),
			planted('src/modules/shell/api/consent/registry.ts', "import { y } from '../../lib/legal';"),
			planted(
				'src/modules/shell/api/consent/types.ts',
				"import type { Z } from '$modules/shell/config/legal';"
			)
		];
		expect(
			apiReadsLibFindings(files, {
				'src/modules/shell/api/consent/registry.ts': 'listed',
				'src/modules/shell/api/gone.ts': 'listed'
			})
		).toEqual([
			'src/modules/shell/api/consent/map.ts: api/ reads lib/',
			'src/modules/shell/api/gone.ts: a stale exception'
		]);
	});

	// BLOCKER-1 of the audit, as it was: the streamed rows copied into `$state`, «Δοκιμή ξανά» fetching outside a query.
	it('U-29.3 (negative): rune state typed with an `api/` answer and a transport called outside `queryFn` are reported — the former hook’s shape', () => {
		const formerHook = planted(
			'src/modules/search-doctors/ui/discovery-home/hooks/use-streamed-sections.svelte.ts',
			[
				"import type { StreamedSectionResult } from '$modules/search-doctors/api/home';",
				"import { fetchHomeSection } from '$modules/search-doctors/api/marketplace';",
				'let results = $state<Partial<Record<SectionId, StreamedSectionResult>>>({});',
				'async function retryOne(config) {',
				'	const result = await fetchHomeSection(queryClient, config, EMPTY, lang);',
				'}'
			].join('\n')
		);
		const query = planted(
			'src/modules/search-doctors/ui/discovery-home/hooks/use-sections.svelte.ts',
			[
				"import { fetchHomeSection } from '$modules/search-doctors/api/marketplace/build-section-query';",
				'const query = createQuery(() => ({',
				'	queryFn: ({ signal }) =>',
				'		fetchHomeSection(queryClient, config, scope, lang, { signal })',
				'}));',
				'let open = $state<boolean>(false);',
				"import { searchResultsInfiniteQuery } from '$modules/search-doctors/api/marketplace/search-results';",
				'const read = createInfiniteQuery(() => searchResultsInfiniteQuery(queryClient, scope, lang));'
			].join('\n')
		);
		expect(runesApiFindings([formerHook, query])).toEqual([
			'src/modules/search-doctors/ui/discovery-home/hooks/use-streamed-sections.svelte.ts:3 rune state holds StreamedSectionResult',
			'src/modules/search-doctors/ui/discovery-home/hooks/use-streamed-sections.svelte.ts:5 fetchHomeSection() outside a query'
		]);
	});
});

import { describe, expect, it } from 'vitest';
import { readSourceFiles, stripComments, type SourceFile } from './source-scan';

/**
 * 🔴 D2 review r2, obligation (β): a results address is read ONLY through its readers, `readSearchDoctorsCriteria`
 * and `readSearchDoctorsFilters` (S-07.3 rule 11, web: they drop the coordinates an old link carries). Their parsers
 * take the raw names — the coordinates among them — so nothing outside their own lib may call them, and (NIT-11 of
 * r1) no file of the search's pages reads a parameter of the address itself: a new reader would bring the device's
 * position back into a link's search. The one exception is the S-07.3 detector of an old link, which only asks
 * whether the coordinates are there (`.has`) to replace that link by the clean address.
 */
const PARSERS: { owner: string; pattern: RegExp }[] = [
	{
		owner: 'src/modules/search-doctors/lib/search-criteria/',
		pattern: /\bresolveSearchDoctorsCriteria\b/g
	},
	{
		owner: 'src/modules/search-doctors/lib/search-filters/',
		pattern: /\bresolveSearchDoctorsFilters\b/g
	}
];

/** Where a results address is in hand: the search's module, the results' screen and route. */
const ADDRESS_HOLDERS = [
	'src/modules/search-doctors/',
	'src/screens/doctors/',
	'src/routes/doctors/'
];
/** The readers' own libs read the raw parameters (that is their job). */
const READER_LIBS = PARSERS.map(({ owner }) => owner);
/** A parameter's VALUE read off a query (`.get`, `.getAll`, or a walk over its entries). */
const RAW_QUERY_READ =
	/\b(?:searchParams|params|query)\s*\.\s*(?:get|getAll|entries|forEach|keys|values)\s*\(/g;

const lineOf = (text: string, index: number | undefined) =>
	text.slice(0, index ?? 0).split('\n').length;

/** Every use of a raw parser outside its own lib, as `path:line`. */
function rawReadersOf(files: SourceFile[]): string[] {
	return PARSERS.flatMap(({ owner, pattern }) =>
		files
			.filter((file) => !file.path.startsWith(owner))
			.flatMap((file) =>
				[...file.text.matchAll(pattern)].map(
					(match) => `${file.path}:${lineOf(file.text, match.index)}`
				)
			)
	);
}

/** Every raw read of a query's parameter in the search's pages, outside the readers' libs, as `path:line`. */
function rawQueryReadsOf(files: SourceFile[]): string[] {
	return files
		.filter((file) => ADDRESS_HOLDERS.some((holder) => file.path.startsWith(holder)))
		.filter((file) => !READER_LIBS.some((owner) => file.path.startsWith(owner)))
		.flatMap((file) =>
			[...file.text.matchAll(RAW_QUERY_READ)].map(
				(match) => `${file.path}:${lineOf(file.text, match.index)}`
			)
		);
}

describe('architecture: the results address', () => {
	it('S-07.3 (κανόνας 11, web) / D2 r2 (β): no reader of a results address but its readers — `resolveSearchDoctorsCriteria` and `resolveSearchDoctorsFilters` stay inside their libs', () => {
		expect(rawReadersOf(readSourceFiles())).toEqual([]);
	});

	it('S-07.3 (κανόνας 11, web, negative): a page that parses the address itself is reported', () => {
		const planted: SourceFile = {
			path: 'src/modules/search-doctors/ui/search-results/page/index.svelte',
			text: stripComments(
				'<script lang="ts">\n\timport { resolveSearchDoctorsCriteria } from \'$modules/search-doctors/lib/search-criteria\';\n\tconst criteria = resolveSearchDoctorsCriteria({});\n</script>'
			)
		};
		expect(rawReadersOf([planted])).toEqual([
			'src/modules/search-doctors/ui/search-results/page/index.svelte:2',
			'src/modules/search-doctors/ui/search-results/page/index.svelte:3'
		]);
	});

	it('S-07.3 (κανόνας 11, web, negative, NIT-11 of r1): the filters’ parser outside lib/search-filters is reported too', () => {
		const planted: SourceFile = {
			path: 'src/modules/search-doctors/ui/search-filters/hooks/use-filters-state.svelte.ts',
			text: stripComments(
				"import { resolveSearchDoctorsFilters } from '../../../lib/search-filters';\nconst filters = resolveSearchDoctorsFilters({});"
			)
		};
		expect(rawReadersOf([planted])).toEqual([
			'src/modules/search-doctors/ui/search-filters/hooks/use-filters-state.svelte.ts:1',
			'src/modules/search-doctors/ui/search-filters/hooks/use-filters-state.svelte.ts:2'
		]);
	});

	it('S-07.3 (κανόνας 11, web) / NIT-11 of r1: no page, screen or route of the search reads a parameter of the address itself', () => {
		expect(rawQueryReadsOf(readSourceFiles())).toEqual([]);
	});

	it('S-07.3 (κανόνας 11, web, negative, NIT-11 of r1): a raw `searchParams.get` in a page or a route is reported — the old link’s detector (`.has`) and the readers’ libs are not', () => {
		const planted: SourceFile[] = [
			{
				path: 'src/modules/search-doctors/ui/search-results/page/index.svelte',
				text: "<script lang=\"ts\">\n\tconst params = page.url.searchParams;\n\tif (params.has('whereLat')) replace();\n\tconst lat = params.get('whereLat');\n</script>"
			},
			{
				path: 'src/routes/doctors/+page.server.ts',
				text: "export const load = ({ url }) => url.searchParams.get('what');"
			},
			{
				path: 'src/modules/search-doctors/lib/search-filters/index.ts',
				text: 'const value = searchParams.get(key);'
			},
			{
				path: 'src/modules/shell/ui/site-frame/page/index.svelte',
				text: "const tab = page.url.searchParams.get('tab');"
			}
		];
		expect(rawQueryReadsOf(planted)).toEqual([
			'src/modules/search-doctors/ui/search-results/page/index.svelte:4',
			'src/routes/doctors/+page.server.ts:1'
		]);
	});
});

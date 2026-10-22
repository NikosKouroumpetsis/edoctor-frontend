import { describe, expect, it } from 'vitest';
import { readSourceFiles, stripComments, type SourceFile } from './source-scan';

const OWNER = 'src/shared/lib/utils.ts';
const MERGE_PACKAGES = /from\s+['"](tailwind-merge|tailwind-variants)(\/[^'"]*)?['"]/g;

/**
 * Every import of `tailwind-merge` or `tailwind-variants` outside `src/shared/lib/utils.ts`. Both must share
 * the one merge config that knows our size names (tailwind-variants keeps a single merger cache for the
 * whole app), so components take `cn`/`tv` from utils and never from the packages.
 */
function findForeignImports(files: SourceFile[]): string[] {
	return files
		.filter((file) => file.path !== OWNER)
		.flatMap((file) =>
			[...file.text.matchAll(MERGE_PACKAGES)].map(
				(match) =>
					`${file.path}:${file.text.slice(0, match.index ?? 0).split('\n').length} ${match[1]}`
			)
		);
}

describe('class merge import checker', () => {
	it('reports a component that imports the merge packages directly', () => {
		const files: SourceFile[] = [
			{ path: OWNER, text: `import { extendTailwindMerge } from 'tailwind-merge';` },
			{
				path: 'src/a.svelte',
				text: stripComments(`<script>\n\timport { tv } from 'tailwind-variants';\n</script>`)
			},
			{ path: 'src/b.ts', text: `import { twMerge } from "tailwind-merge";` },
			{ path: 'src/c.ts', text: stripComments(`// import { tv } from 'tailwind-variants';`) }
		];
		expect(findForeignImports(files)).toEqual([
			'src/a.svelte:2 tailwind-variants',
			'src/b.ts:1 tailwind-merge'
		]);
	});
});

describe('class merge imports of the project', () => {
	it('imports tailwind-merge and tailwind-variants only in the shared utils', () => {
		const files = readSourceFiles();
		expect(files.some((file) => file.path === OWNER)).toBe(true);
		expect(findForeignImports(files)).toEqual([]);
	});
});

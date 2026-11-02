import { describe, expect, it } from 'vitest';
import { readSourceFiles, stripComments, type SourceFile } from './source-scan';

const RAW_HTML = /\{@html\s/g;

/**
 * Every `{@html …}` that is not the page's JSON-LD (common v2 §B, U-57.4): a CMS text is drawn by `RichText` from
 * its allowlist, never as markup, so the one raw output allowed is the `<svelte:head>` script that
 * `jsonLdScript` has escaped (its `<` `>` `&` and line separators), in a file that builds it with that helper.
 */
function findRawHtml(files: SourceFile[]): string[] {
	return files.flatMap((file) =>
		[...file.text.matchAll(RAW_HTML)].flatMap((match) => {
			const at = match.index ?? 0;
			const before = file.text.slice(0, at);
			const inHead = before.lastIndexOf('<svelte:head') > before.lastIndexOf('</svelte:head>');
			const escaped = file.text.includes('jsonLdScript(');
			if (inHead && escaped) return [];
			return [`${file.path}:${before.split('\n').length}`];
		})
	);
}

describe('raw HTML checker', () => {
	it('common v2 §B: the escaped JSON-LD in the head passes', () => {
		const file = {
			path: 'src/a.svelte',
			text: stripComments(
				`<script>\n\tconst ld = $derived(jsonLdScript(doc));\n</script>\n<svelte:head>\n\t{@html ld}\n</svelte:head>`
			)
		};
		expect(findRawHtml([file])).toEqual([]);
	});

	it('common v2 §B (negative): markup in the body, or a head script not built by `jsonLdScript`, is reported', () => {
		const files: SourceFile[] = [
			{ path: 'src/body.svelte', text: stripComments(`<div>\n\t{@html answer}\n</div>`) },
			{
				path: 'src/head.svelte',
				text: stripComments(`<svelte:head>\n\t{@html JSON.stringify(doc)}\n</svelte:head>`)
			},
			{
				path: 'src/after.svelte',
				text: stripComments(
					`<script>const ld = jsonLdScript(d);</script>\n<svelte:head></svelte:head>\n{@html ld}`
				)
			},
			{ path: 'src/comment.svelte', text: stripComments(`<!-- {@html note} -->`) }
		];
		expect(findRawHtml(files)).toEqual([
			'src/body.svelte:2',
			'src/head.svelte:2',
			'src/after.svelte:3'
		]);
	});

	it('common v2 §B: no source draws raw HTML but the escaped JSON-LD', () => {
		expect(findRawHtml(readSourceFiles())).toEqual([]);
	});
});

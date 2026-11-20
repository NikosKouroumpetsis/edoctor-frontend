// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import type { Schema } from '@tiptap/pm/model';
import { ARTICLE_TEXT_LIMITS, articleVideoEmbedUrl } from '$shared/lib/article-text';
import { toDoctorArticleBody } from '$modules/doctor-dashboard/api/articles';
import {
	DOCTOR_ARTICLE_COVER_LEAST_DOWN,
	DOCTOR_ARTICLE_COVER_LEAST_ACROSS,
	DOCTOR_ARTICLE_IMAGE_LEAST_PIXELS,
	DOCTOR_ARTICLE_SHORT_DESCRIPTION_MAX_LENGTH,
	DOCTOR_ARTICLE_TITLE_MAX_LENGTH,
	DOCTOR_ARTICLES_PAGE_LIMIT
} from '$modules/doctor-dashboard/config';
import { buildDoctorMenuGroups } from '$modules/doctor-dashboard/lib/menu';
import { articleEditorExtensions } from '$modules/doctor-dashboard/ui/article/lib/extensions';
import { projectRoot, readSourceFiles, stripComments, type SourceFile } from './source-scan';

/**
 * 🔴 Wave 5.2 · screen 85 «Τα άρθρα μου» (U-221, U-222, D-W52-99 … 104): the rules the web keeps for the doctor's
 * articles, read where they live (the `review-rules` way) — the text's limits and the form's bounds are the server's own
 * (so the doctor never reaches its refusal); «Τα άρθρα μου» is a row of «Μενού» that leads to its page (no void,
 * D-W45-02); a write sends Greek alone and never a slug, an SEO field or a state (U-207.3, U-222.4); a video's frame
 * comes from ONE fixed template, YouTube without cookies, sandboxed, and only on a press (D-W52-104); a link of the
 * doctor's text is `nofollow ugc` in a new tab; and no word of an article is ever drawn as markup (U-65.6). A server that
 * says them otherwise fails here (S-22: ask), never the client silently.
 */
const readBackend = (path: string) => readFileSync(join(projectRoot, '../backend', path), 'utf8');
const readWeb = (path: string) => stripComments(readFileSync(join(projectRoot, path), 'utf8'));

const CONTENT_POLICY = 'src/modules/article/domain/policies/content/Policy.ts';
const IMAGE_POLICY = 'src/modules/article/domain/policies/image/Policy.ts';
const SCHEMA = 'src/modules/article/presentation/schemas/article.schema.ts';
const SLICES =
	/^src\/(modules\/doctor-dashboard\/(ui\/articles?|lib\/articles|api\/articles)|modules\/articles|shared\/lib\/(article-text|rich-text)|shared\/ui\/molecules\/rich-text)\//u;
const NOT_A_TEST = (file: SourceFile) =>
	!/\.test\.ts$|\.sample\.ts$|harness\.svelte$|\.stories\.svelte$/u.test(file.path);

/** The server's `LIMITS` of a text, name ⇒ number; `{}` when it no longer writes them. */
function serverLimits(policy: string): Record<string, number> {
	const block = /static readonly LIMITS = \{([^}]*)\}/u.exec(policy)?.[1] ?? '';
	return Object.fromEntries(
		[...block.matchAll(/(\w+): ([\d_]+)/gu)].map(([, name, value]) => [
			name,
			Number(value.replace(/_/gu, ''))
		])
	);
}

function limitFindings(policy: string, web: Record<string, number>): string[] {
	const server = serverLimits(policy);
	const names = [
		'characters',
		'nodes',
		'depth',
		'images',
		'videos',
		'tables',
		'hrefLength',
		'altLength',
		'captionLength',
		'orderedListStartMax'
	];
	return names.flatMap((name) =>
		server[name] === web[name]
			? []
			: [`${name}: the server keeps ${server[name]}, the web ${web[name]}`]
	);
}

function boundFindings(schema: string, image: string): string[] {
	const findings: string[] = [];
	const write =
		/articleDoctorWriteSchema[\s\S]*?title: \{ type: "string", maxLength: (\d+) \}[\s\S]*?shortDescription: \{ type: \["string", "null"\], maxLength: (\d+) \}/u.exec(
			schema
		);
	if (!write) findings.push(`${SCHEMA}: no bounds of the doctor's write`);
	else {
		if (Number(write[1]) !== DOCTOR_ARTICLE_TITLE_MAX_LENGTH)
			findings.push(`title: the server ${write[1]}, the web ${DOCTOR_ARTICLE_TITLE_MAX_LENGTH}`);
		if (Number(write[2]) !== DOCTOR_ARTICLE_SHORT_DESCRIPTION_MAX_LENGTH)
			findings.push(
				`shortDescription: the server ${write[2]}, the web ${DOCTOR_ARTICLE_SHORT_DESCRIPTION_MAX_LENGTH}`
			);
	}
	const cover = /COVER_MIN_DIMENSIONS = \{ width: (\d+), height: (\d+) \}/u.exec(image);
	if (
		!cover ||
		Number(cover[1]) !== DOCTOR_ARTICLE_COVER_LEAST_ACROSS ||
		Number(cover[2]) !== DOCTOR_ARTICLE_COVER_LEAST_DOWN
	)
		findings.push('the cover’s least size is not the server’s');
	const content = /CONTENT_MIN_DIMENSIONS = \{ width: (\d+), height: (\d+) \}/u.exec(image);
	if (
		!content ||
		Number(content[1]) !== DOCTOR_ARTICLE_IMAGE_LEAST_PIXELS ||
		Number(content[2]) !== DOCTOR_ARTICLE_IMAGE_LEAST_PIXELS
	)
		findings.push('the least size of an image of the text is not the server’s');
	return findings;
}

/**
 * 🔴 U-65.6: a file of the screen's slices or of the renderer that draws markup (`{@html}`, `innerHTML` …) — the page's
 * escaped JSON-LD in its `<svelte:head>` aside (common v2 §B, `raw-html.test.ts` owns that one).
 */
function markupFindings(files: SourceFile[]): string[] {
	const withoutJsonLd = (text: string) =>
		text.includes('jsonLdScript(')
			? text.replace(/<svelte:head>[\s\S]*?<\/svelte:head>/gu, '')
			: text;
	return files
		.filter((file) => SLICES.test(file.path) && NOT_A_TEST(file))
		.filter((file) =>
			/\{@html\b|\binnerHTML\b|outerHTML\b|insertAdjacentHTML|DOMParser/u.test(
				withoutJsonLd(file.text)
			)
		)
		.map((file) => `${file.path}: markup drawn from words`);
}

/** 🔴 D-W52-104: a frame of the renderer — only the fixed template's, sandboxed, behind a press. */
function frameFindings(files: SourceFile[]): string[] {
	return files
		.filter((file) => /<iframe\b/u.test(file.text) && NOT_A_TEST(file))
		.flatMap((file) => {
			const findings: string[] = [];
			if (file.path !== 'src/shared/ui/molecules/rich-text/rich-text-video.svelte')
				findings.push(`${file.path}: a frame outside the renderer's video`);
			if (
				!/sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"/u.test(
					file.text
				)
			)
				findings.push(`${file.path}: a frame without its sandbox`);
			if (!/\{#if playing\}\s*<iframe/u.test(file.text))
				findings.push(`${file.path}: a frame drawn before a press`);
			if (/src=\{[^}]*\+|src="http/u.test(file.text))
				findings.push(`${file.path}: a frame whose address is not the template's`);
			return findings;
		});
}

/** A schema's nodes and marks as `name content [attrs]` lines, to be set side by side. */
type SchemaShape = { nodes: string[]; marks: string[] };

/** 🔴 D-W52-99: the server's `SCHEMA` (`ArticleContentPolicy`), read from its text — nodes, their content, their attributes. */
function serverSchema(policy: string): SchemaShape {
	const block =
		/static readonly SCHEMA = new Schema\(\{([\s\S]*?)\n {2}\}\);/u.exec(policy)?.[1] ?? '';
	const [nodesText, marksText = ''] = block.split(/\n {4}marks: \{/u);
	const cellAttrs = Object.keys(
		Object.fromEntries(
			[
				...(
					/cellAttrSpecs\(\): [^{]*\{\s*return \{([\s\S]*?)\};/u.exec(policy)?.[1] ?? ''
				).matchAll(/(\w+): \{/gu)
			].map(([, name]) => [name, true])
		)
	);
	const entries = (text: string) =>
		text
			.split(/\n(?= {6}\w+: )/u)
			.map((chunk) => /^\s*(\w+): ([\s\S]*)$/u.exec(chunk))
			.filter((match): match is RegExpExecArray => match !== null && match[1] !== 'nodes');
	const attrsOf = (body: string) => {
		if (body.includes('cellAttrSpecs()')) return cellAttrs;
		const attrs = /attrs: \{([\s\S]*)\}/u.exec(body)?.[1] ?? '';
		return [...attrs.matchAll(/(?:^|[{,])\s*(\w+): \{/gu)].map(([, name]) => name);
	};
	const line = (name: string, body: string) =>
		`${name} ${/content: "([^"]*)"/u.exec(body)?.[1] ?? '-'} [${attrsOf(body).sort().join(',')}]`;
	return {
		nodes: entries(nodesText.replace(/^[\s\S]*?nodes: \{/u, ''))
			.map(([, name, body]) => line(name, body))
			.sort(),
		marks: entries(marksText)
			.map(([, name, body]) => line(name, body))
			.sort()
	};
}

/** The editor's schema as the same lines. */
function editorSchema(schema: Schema): SchemaShape {
	const line = (
		name: string,
		content: string | undefined,
		attrs: Record<string, unknown> | undefined
	) =>
		`${name} ${content || '-'} [${Object.keys(attrs ?? {})
			.sort()
			.join(',')}]`;
	return {
		nodes: Object.values(schema.nodes)
			.map((type) => line(type.name, type.spec.content, type.spec.attrs))
			.sort(),
		marks: Object.values(schema.marks)
			.map((type) => line(type.name, type.spec.content, type.spec.attrs))
			.sort()
	};
}

const theEditorSchema = () =>
	getSchema(
		articleEditorExtensions({
			imageUrl: () => null,
			videoLabel: (name) => name,
			placeholder: '',
			onLinkShortcut: () => undefined,
			onLimit: () => undefined
		})
	);

/** 🔴 U-222.2: the editor's library lives in ONE slice — screen 85's editor; nothing else of the web imports it. */
function editorLibraryFindings(files: SourceFile[]): string[] {
	return files
		.filter((file) => /from\s+['"]@tiptap\//u.test(file.text))
		.filter((file) => !file.path.startsWith('src/modules/doctor-dashboard/ui/article/'))
		.map((file) => `${file.path}: the editor's library outside screen 85's editor`);
}

/** 🔴 The editor reaches no first bundle: no file imports a VALUE of it — only the article page's `import()`. */
function editorBundleFindings(files: SourceFile[]): string[] {
	const SLICE = 'src/modules/doctor-dashboard/ui/article/';
	const valueImport = (from: string) =>
		new RegExp(`\\bimport\\s+(?!type\\b)[^'";]*from\\s*['"]${from}['"]`, 'u');
	return files
		.filter((file) => NOT_A_TEST(file))
		.filter(
			(file) =>
				valueImport('[^\'"]*doctor-dashboard\\/ui\\/article\\/components\\/editor\\.svelte').test(
					file.text
				) ||
				(file.path.startsWith(SLICE) &&
					valueImport('\\.{1,2}\\/(components\\/)?editor\\.svelte').test(file.text))
		)
		.map((file) => `${file.path}: the editor imported into a first bundle`);
}

const files = () => readSourceFiles();

describe('🔴 U-222 / D-W52-99 … 104 · the doctor’s articles on the web', () => {
	it('🔴 D-W52-99 / D-W52-103: the text’s limits are the server’s own — 50.000 characters, 5.000 nodes, depth 10, 20 images, 5 videos, 10 tables', () => {
		expect(limitFindings(readBackend(CONTENT_POLICY), ARTICLE_TEXT_LIMITS)).toEqual([]);
	});

	it('🔴 D-W52-103: the form’s bounds are the server’s own — title 200, short description 300, a cover 800 × 600, an image of the text 200 × 200; a page of the list within the server’s 50', () => {
		expect(boundFindings(readBackend(SCHEMA), readBackend(IMAGE_POLICY))).toEqual([]);
		expect(DOCTOR_ARTICLES_PAGE_LIMIT).toBeLessThanOrEqual(50);
	});

	it('(negative, planted) a limit or a bound the server says otherwise is reported', () => {
		expect(
			limitFindings(
				'static readonly LIMITS = { characters: 40_000, nodes: 5_000 }',
				ARTICLE_TEXT_LIMITS
			)
		).toContain('characters: the server keeps 40000, the web 50000');
		expect(boundFindings('', '')).toHaveLength(3);
	});

	it('🔴 D-W52-102 (D-W45-02): «Τα άρθρα μου» is a row of «Μενού», in the ☰ and on the page, and leads to its page', () => {
		for (const place of ['menu', 'page'] as const)
			expect(
				buildDoctorMenuGroups('el', place)
					.flat()
					.map((row) => row.id)
			).toContain('articles');
		for (const path of [
			'src/modules/doctor-dashboard/ui/menu/page/index.svelte',
			'src/modules/doctor-dashboard/ui/frame/page/index.svelte'
		])
			expect(readWeb(path), path).toMatch(/articles: doctorArticlesPath/u);
	});

	it('🔴 U-207.3 · U-222.4: a write sends Greek alone and NEVER a slug, an SEO field, an author or a state', () => {
		const body = toDoctorArticleBody({
			kind: 'ARTICLE',
			title: 'α',
			shortDescription: 'β',
			content: null
		}) as Record<string, unknown>;
		expect(body.language).toBe('el');
		expect(Object.keys(body).sort()).toEqual(
			['content', 'language', 'shortDescription', 'title', 'type'].sort()
		);
		expect(readWeb('src/modules/doctor-dashboard/api/articles/map.ts')).not.toMatch(
			/language: '(?!el')/u
		);
	});

	it('🔴 D-W52-104 (U-222.4): ONE frame in the whole web — the renderer’s video, sandboxed, behind a press, from the fixed template (YouTube without cookies)', () => {
		expect(frameFindings(files())).toEqual([]);
		expect(articleVideoEmbedUrl({ provider: 'youtube', id: 'dQw4w9WgXcQ' })).toMatch(
			/^https:\/\/www\.youtube-nocookie\.com\/embed\//u
		);
		expect(readWeb('src/shared/ui/molecules/rich-text/rich-text.svelte')).toMatch(
			/'nofollow ugc noopener noreferrer'/u
		);
		expect(readWeb('src/modules/articles/ui/detail/page/index.svelte')).toMatch(
			/<RichText[\s\S]*?userContent[\s\S]*?\/>/u
		);
	});

	it('(negative, planted) a frame elsewhere, without its sandbox, drawn at once or with a built address is reported', () => {
		const planted = (path: string, text: string): SourceFile => ({ path, text });
		expect(
			frameFindings([
				planted(
					'src/modules/x.svelte',
					'{#if playing}<iframe sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" src={url}></iframe>'
				),
				planted(
					'src/shared/ui/molecules/rich-text/rich-text-video.svelte',
					'<iframe src="https://x"></iframe>'
				)
			])
		).toEqual([
			"src/modules/x.svelte: a frame outside the renderer's video",
			'src/shared/ui/molecules/rich-text/rich-text-video.svelte: a frame without its sandbox',
			'src/shared/ui/molecules/rich-text/rich-text-video.svelte: a frame drawn before a press',
			"src/shared/ui/molecules/rich-text/rich-text-video.svelte: a frame whose address is not the template's"
		]);
	});

	it('🔴 U-65.6 (common v2 §B): no file of the articles or of their renderer draws markup from words', () => {
		expect(markupFindings(files())).toEqual([]);
		expect(
			markupFindings([
				{ path: 'src/modules/articles/ui/x.svelte', text: '<div>{@html body}</div>' },
				{ path: 'src/shared/lib/rich-text/x.ts', text: 'node.innerHTML = text;' },
				{ path: 'src/modules/doctor-dashboard/ui/articles/x.ts', text: 'new DOMParser()' }
			])
		).toHaveLength(3);
	});

	it('🔴 D-W52-99 (U-222.4): the editor’s schema IS the server’s — the same nodes, each with the same content and attributes, and the same six marks', () => {
		const server = serverSchema(readBackend(CONTENT_POLICY));
		expect(server.nodes).toHaveLength(17);
		expect(server.marks).toHaveLength(6);
		expect(editorSchema(theEditorSchema())).toEqual(server);
	});

	it('(negative, planted) a node, a content or an attribute the server says otherwise is reported', () => {
		const server = serverSchema(readBackend(CONTENT_POLICY));
		const planted = serverSchema(
			readBackend(CONTENT_POLICY)
				.replace(
					'tableRow: { content: "(tableCell | tableHeader)+" }',
					'tableRow: { content: "(tableCell | tableHeader)*" }'
				)
				.replace('      horizontalRule: { group: "block" },\n', '')
		);
		expect(planted.nodes).not.toEqual(server.nodes);
		expect(planted.nodes).toHaveLength(16);
		expect(planted.nodes).toContain('tableRow (tableCell | tableHeader)* []');
		expect(server.nodes).toContain('image - [alt,caption,imageId]');
		expect(server.nodes).toContain(
			'tableCell (paragraph | bulletList | orderedList)+ [colspan,colwidth,rowspan]'
		);
		expect(server.marks).toContain('link - [href]');
	});

	it('🔴 U-222.2: the editor loads with an article’s page alone (`import()`), never with the list or another page', () => {
		expect(editorBundleFindings(files())).toEqual([]);
		expect(readWeb('src/modules/doctor-dashboard/ui/article/page/index.svelte')).toContain(
			"import('../components/editor.svelte')"
		);
		expect(
			editorBundleFindings([
				{
					path: 'src/modules/doctor-dashboard/ui/article/page/a.svelte',
					text: "import Editor from '../components/editor.svelte';"
				},
				{
					path: 'src/screens/b.svelte',
					text: "import Editor from '$modules/doctor-dashboard/ui/article/components/editor.svelte';"
				},
				{
					path: 'src/modules/doctor-dashboard/ui/article/page/c.svelte',
					text: "const editor = import('../components/editor.svelte');"
				},
				{
					path: 'src/modules/x/ui/y/page/d.svelte',
					text: "import Editor from '../components/editor.svelte';"
				}
			])
		).toEqual([
			'src/modules/doctor-dashboard/ui/article/page/a.svelte: the editor imported into a first bundle',
			'src/screens/b.svelte: the editor imported into a first bundle'
		]);
	});

	it('🔴 U-222.2: the editor’s library is imported by screen 85’s editor alone', () => {
		expect(editorLibraryFindings(files())).toEqual([]);
		expect(
			editorLibraryFindings([
				{
					path: 'src/shared/ui/molecules/x/x.svelte',
					text: "import { Editor } from '@tiptap/core';"
				},
				{
					path: 'src/modules/doctor-dashboard/ui/article/lib/x.ts',
					text: "import { Editor } from '@tiptap/core';"
				}
			])
		).toEqual([
			"src/shared/ui/molecules/x/x.svelte: the editor's library outside screen 85's editor"
		]);
	});
});

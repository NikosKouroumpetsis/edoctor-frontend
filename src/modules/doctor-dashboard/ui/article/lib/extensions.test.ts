import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Editor, type JSONContent } from '@tiptap/core';
import {
	ARTICLE_TEXT_LIMITS,
	cleanArticleTextDoc,
	readArticleText,
	type ArticleTextLimit
} from '$shared/lib/article-text';
import {
	articleEditorExtensions,
	editorTextStats,
	insertArticleBlock,
	toggleArticleWrap
} from './extensions';

/*
 * 🔴 Wave 5.2 · screen 85 (U-222.2, U-222.4, D-W52-99 / 103): the editor's extensions write EXACTLY the server's closed
 * schema (`w52-b9b.md` §1) — every tool's output passes the shared strict reading (`readArticleText`), a paste keeps
 * only what is allowed, and no change passes a limit of the server's.
 */

const IMAGE = '0199aaaa-0000-7000-8000-000000000001';
const text = (words: string, marks?: JSONContent['marks']): JSONContent => ({
	type: 'text',
	text: words,
	...(marks ? { marks } : {})
});
const paragraph = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content });
const cell = (type: 'tableHeader' | 'tableCell', words: string): JSONContent => ({
	type,
	attrs: { colspan: 1, rowspan: 1, colwidth: null },
	content: [paragraph(text(words))]
});

/** Every node and mark of the closed list once — the server's «Άρθρο με όλα». */
const EVERYTHING: JSONContent = {
	type: 'doc',
	content: [
		{ type: 'heading', attrs: { level: 2 }, content: [text('Πριν από τη μέτρηση')] },
		{ type: 'heading', attrs: { level: 3 }, content: [text('Υπότιτλος')] },
		paragraph(
			text('Έντονα', [{ type: 'bold' }]),
			text(' πλάγια', [{ type: 'italic' }]),
			text(' υπογράμμιση', [{ type: 'underline' }]),
			{ type: 'hardBreak' },
			text('διαγραφή', [{ type: 'strike' }]),
			text(' επισήμανση', [{ type: 'highlight' }]),
			text('ΕΟΔΥ', [{ type: 'link', attrs: { href: 'https://eody.gov.gr/' } }])
		),
		{ type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('Ένα'))] }] },
		{
			type: 'orderedList',
			attrs: { start: 1, type: null },
			content: [
				{
					type: 'listItem',
					content: [
						paragraph(text('Πρώτα')),
						{
							type: 'bulletList',
							content: [{ type: 'listItem', content: [paragraph(text('Μέσα'))] }]
						}
					]
				}
			]
		},
		{ type: 'blockquote', content: [paragraph(text('Παράθεμα'))] },
		{ type: 'callout', content: [paragraph(text('Σημαντικό: καλέστε το 166.'))] },
		{ type: 'horizontalRule' },
		{ type: 'image', attrs: { imageId: IMAGE, alt: 'Πιεσόμετρο', caption: 'Λεζάντα' } },
		{ type: 'video', attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' } },
		{ type: 'video', attrs: { provider: 'vimeo', id: '76979871' } },
		{
			type: 'table',
			content: [
				{ type: 'tableRow', content: [cell('tableHeader', 'Τιμή'), cell('tableHeader', 'Όριο')] },
				{ type: 'tableRow', content: [cell('tableCell', '120'), cell('tableCell', '80')] }
			]
		},
		paragraph(text('Τέλος.'))
	]
};

let limits: ArticleTextLimit[] = [];
let linkShortcuts: true[] = [];
const editors: Editor[] = [];

function make(content?: JSONContent): Editor {
	const editor = new Editor({
		element: document.createElement('div'),
		content,
		extensions: articleEditorExtensions({
			imageUrl: (id) => (id === IMAGE ? 'https://cdn.example.org/l.webp' : null),
			videoLabel: (name) => `Βίντεο ${name} · φορτώνει όταν το πατήσει ο ασθενής`,
			placeholder: 'Γράψτε το άρθρο σας…',
			onLinkShortcut: () => linkShortcuts.push(true),
			onLimit: (limit) => limits.push(limit)
		})
	});
	editors.push(editor);
	return editor;
}

/** A paste as the browser makes it (jsdom has no `ClipboardEvent`). */
const paste = (editor: Editor, html: string) =>
	editor.view.pasteHTML(html, new Event('paste') as ClipboardEvent);

/** What the page sends: the editor's JSON as the server takes it, read by the shared strict reading. */
const sent = (editor: Editor) => readArticleText(cleanArticleTextDoc(editor.getJSON()));

beforeAll(() => {
	// jsdom draws no layout: ProseMirror asks a range for its boxes when it scrolls the selection into view.
	const empty = () => ({
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: 0,
		height: 0,
		toJSON: () => ({})
	});
	Range.prototype.getBoundingClientRect = empty as never;
	Range.prototype.getClientRects = (() => ({
		length: 0,
		item: () => null,
		[Symbol.iterator]: [][Symbol.iterator]
	})) as never;
	document.elementFromPoint = (() => null) as never;
});

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
	limits = [];
	linkShortcuts = [];
	vi.unstubAllGlobals();
});

describe('🔴 U-222 / D-W52-99 · the editor writes the server’s closed schema', () => {
	it('🔴 D-W52-99: a document with EVERY tool passes the shared strict reading and comes back as written', () => {
		const editor = make(EVERYTHING);
		expect(editor.getJSON()).toEqual(EVERYTHING);
		expect(sent(editor)).toEqual(EVERYTHING);
	});

	it('🔴 D-W52-103: each tool of the toolbar writes its node or mark of the schema — and nothing the server refuses', () => {
		const editor = make();
		const select = () =>
			editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 });
		editor.commands.insertContent('Λέξη');
		for (const tool of [
			'toggleBold',
			'toggleItalic',
			'toggleUnderline',
			'toggleStrike',
			'toggleHighlight'
		] as const) {
			select();
			expect(editor.commands[tool](), tool).toBe(true);
		}
		const marks = (editor.getJSON().content?.[0].content?.[0].marks ?? []).map((mark) => mark.type);
		expect(marks.sort()).toEqual(['bold', 'highlight', 'italic', 'strike', 'underline']);
		select();
		editor.chain().setMark('link', { href: 'https://eody.gov.gr/' }).run();
		expect(editor.getJSON().content?.[0].content?.[0].marks).toContainEqual({
			type: 'link',
			attrs: { href: 'https://eody.gov.gr/' }
		});
		expect(editor.commands.setHeading({ level: 2 })).toBe(true);
		expect(editor.commands.setHeading({ level: 3 })).toBe(true);
		// U-222.2: «Επικεφαλίδα» and «Υποεπικεφαλίδα» only — no level 1, no level 4.
		expect(editor.can().setHeading({ level: 1 as never })).toBe(false);
		expect(editor.can().setHeading({ level: 4 as never })).toBe(false);
		editor.commands.setParagraph();
		expect(editor.commands.toggleBulletList()).toBe(true);
		expect(editor.commands.toggleOrderedList()).toBe(true);
		editor.commands.toggleOrderedList();
		expect(toggleArticleWrap(editor, 'blockquote')).toBe(true);
		expect(editor.getJSON().content?.[0].type).toBe('blockquote');
		expect(toggleArticleWrap(editor, 'blockquote')).toBe(true);
		expect(toggleArticleWrap(editor, 'callout')).toBe(true);
		expect(editor.getJSON().content?.[0].type).toBe('callout');
		expect(toggleArticleWrap(editor, 'callout')).toBe(true);
		expect(editor.getJSON().content?.[0].type).toBe('paragraph');
		editor.commands.setTextSelection(editor.state.doc.content.size - 1);
		expect(editor.commands.setHorizontalRule()).toBe(true);
		expect(editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true })).toBe(true);
		expect(editor.commands.addRowAfter()).toBe(true);
		expect(editor.commands.addColumnAfter()).toBe(true);
		editor.commands.setTextSelection(editor.state.doc.content.size - 1);
		// The cursor goes on after an image or a video: the next one never replaces it.
		expect(
			insertArticleBlock(editor, {
				type: 'image',
				attrs: { imageId: IMAGE, alt: 'Εικόνα', caption: null }
			})
		).toBe(true);
		expect(
			insertArticleBlock(editor, { type: 'video', attrs: { provider: 'vimeo', id: '76979871' } })
		).toBe(true);
		expect(editorTextStats(editor.state.doc)).toMatchObject({ images: 1, videos: 1, tables: 1 });
		expect(editor.commands.undo()).toBe(true);
		expect(editor.commands.redo()).toBe(true);
		const doc = sent(editor);
		expect(doc).not.toBeNull();
		const types = JSON.stringify(doc);
		for (const name of [
			'"link"',
			'"horizontalRule"',
			'"table"',
			'"tableHeader"',
			'"image"',
			'"video"'
		])
			expect(types, name).toContain(name);
		// U-222.4: a link carries its address alone; a cell its 1 / 1 / null.
		expect(types).not.toMatch(/"target"|"rel"|"class"|"title"|"src"/u);
	});

	it('🔴 U-222.4: a link that is not `https:` never becomes a mark — not through the command, not through a paste', () => {
		const editor = make({ type: 'doc', content: [paragraph(text('κακό'))] });
		editor.commands.setTextSelection({ from: 1, to: 5 });
		paste(
			editor,
			'<a href="javascript:alert(1)">κακό</a> <a href="http://holter-info.gr">http</a> <a href="https://eody.gov.gr/">καλό</a>'
		);
		const hrefs = JSON.stringify(editor.getJSON()).match(/"href":"[^"]*"/gu) ?? [];
		expect(hrefs).toEqual(['"href":"https://eody.gov.gr/"']);
		expect(sent(editor)).not.toBeNull();
	});

	it('🔴 U-222.2 / U-222.4: a pasted page keeps ONLY what is allowed — no image (its `onerror` never runs), no script, no frame, no code, no colour; level 1 a paragraph; a list’s and a cell’s attributes the server’s', () => {
		const pwned = vi.fn();
		vi.stubGlobal('pwned', pwned);
		const editor = make();
		paste(
			editor,
			[
				'<h1>Τίτλος</h1>',
				'<p>α<img src="x" onerror="window.pwned()"><script>window.pwned()</script>',
				'<span style="color:red">χρώμα</span> <code>κώδικας</code></p>',
				'<ol start="0" type="a"><li>ένα</li></ol>',
				'<table><tr><td colspan="2" data-colwidth="90">x</td></tr></table>',
				'<iframe src="https://evil.example"></iframe>',
				'<pre><code>let a = 1;</code></pre>'
			].join('')
		);
		const doc = sent(editor);
		expect(doc).not.toBeNull();
		const json = JSON.stringify(doc);
		expect(json).not.toMatch(/"image"|"iframe"|"codeBlock"|"code"|"script"|"color"|"style"/u);
		expect(json).toContain('"text":"Τίτλος"');
		expect(json).not.toMatch(/"level":1/u);
		expect(json).toContain('"attrs":{"start":1,"type":null}');
		expect(json).not.toMatch(/"colspan":2|"colwidth":\[/u);
		expect(pwned).not.toHaveBeenCalled();
		expect(document.querySelector('img[onerror]')).toBeNull();
	});

	it('🔴 D-W52-99: «Παράθεμα» on a list item wraps its whole list (a box holds lists, a list never a box); a heading cannot be wrapped; a heading of another level becomes level 2', () => {
		const editor = make({
			type: 'doc',
			content: [
				{ type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('Ένα'))] }] },
				{ type: 'heading', attrs: { level: 2 }, content: [text('Τίτλος')] }
			]
		});
		editor.commands.setTextSelection(3);
		expect(toggleArticleWrap(editor, 'blockquote')).toBe(true);
		expect(editor.getJSON().content?.[0]).toMatchObject({
			type: 'blockquote',
			content: [{ type: 'bulletList' }]
		});
		editor.commands.setTextSelection(editor.state.doc.content.size - 2);
		expect(toggleArticleWrap(editor, 'callout')).toBe(false);
		editor.commands.insertContentAt(0, {
			type: 'heading',
			attrs: { level: 1 },
			content: [text('Ένα')]
		});
		expect(editor.getJSON().content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } });
		expect(sent(editor)).not.toBeNull();
	});

	it('🔴 D-W52-100 (U-222.2): a pasted or dropped FILE goes nowhere — an image comes in only by its upload', () => {
		const editor = make();
		const event = { clipboardData: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } };
		const drop = { dataTransfer: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } };
		expect(
			editor.view.someProp('handlePaste', (handle) =>
				handle(editor.view, event as never, null as never)
			)
		).toBe(true);
		expect(
			editor.view.someProp('handleDrop', (handle) =>
				handle(editor.view, drop as never, null as never, false)
			)
		).toBe(true);
	});

	it('🔴 D-W52-103: the server’s limits — a 6th video, a 21st image, an 11th table and the 50.001st character are refused whole, and the page is told which', () => {
		const video = { type: 'video', attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' } };
		const editor = make({
			type: 'doc',
			content: [...Array.from({ length: 5 }, () => video), paragraph(text('α'))]
		});
		editor.commands.setTextSelection(editor.state.doc.content.size - 1);
		// A refused change leaves the text as it was (the command itself ran; the editor never took it).
		expect(insertArticleBlock(editor, video)).toBe(false);
		expect(editorTextStats(editor.state.doc).videos).toBe(5);
		expect(limits).toEqual(['videos']);
		const images = make({
			type: 'doc',
			content: [
				...Array.from({ length: ARTICLE_TEXT_LIMITS.images }, () => ({
					type: 'image',
					attrs: { imageId: IMAGE, alt: 'x', caption: null }
				})),
				paragraph(text('α'))
			]
		});
		images.commands.setTextSelection(images.state.doc.content.size - 1);
		expect(
			insertArticleBlock(images, {
				type: 'image',
				attrs: { imageId: IMAGE, alt: 'x', caption: null }
			})
		).toBe(false);
		expect(editorTextStats(images.state.doc).images).toBe(ARTICLE_TEXT_LIMITS.images);
		const tables = make({
			type: 'doc',
			content: [
				...Array.from({ length: ARTICLE_TEXT_LIMITS.tables }, () => ({
					type: 'table',
					content: [{ type: 'tableRow', content: [cell('tableCell', 'x')] }]
				})),
				paragraph(text('α'))
			]
		});
		tables.commands.setTextSelection(tables.state.doc.content.size - 1);
		tables.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
		expect(editorTextStats(tables.state.doc).tables).toBe(ARTICLE_TEXT_LIMITS.tables);
		const long = make({
			type: 'doc',
			content: [paragraph(text('α'.repeat(ARTICLE_TEXT_LIMITS.characters)))]
		});
		long.commands.setTextSelection(long.state.doc.content.size - 1);
		long.commands.insertContent('β');
		expect(editorTextStats(long.state.doc).characters).toBe(ARTICLE_TEXT_LIMITS.characters);
		expect(limits).toEqual(['videos', 'images', 'tables', 'characters']);
		// A change that only shrinks passes.
		long.commands.setTextSelection({ from: 1, to: 3 });
		long.commands.deleteSelection();
		expect(editorTextStats(long.state.doc).characters).toBe(ARTICLE_TEXT_LIMITS.characters - 2);
	});

	it('🔴 D-W52-103: the shortcuts ⌘ / Ctrl + B, I, U (the marks), K (the link’s band) and Z (undo)', () => {
		const editor = make({ type: 'doc', content: [paragraph(text('Λέξη'))] });
		// «Mod» is ⌘ on a Mac and Ctrl elsewhere (jsdom names no platform: Ctrl).
		const press = (key: string) =>
			editor.view.someProp('handleKeyDown', (handle) =>
				handle(editor.view, new KeyboardEvent('keydown', { key, ctrlKey: true }))
			);
		editor.commands.setTextSelection({ from: 1, to: 5 });
		for (const key of ['b', 'i', 'u']) expect(press(key), key).toBe(true);
		expect(
			(editor.getJSON().content?.[0].content?.[0].marks ?? []).map((mark) => mark.type).sort()
		).toEqual(['bold', 'italic', 'underline']);
		expect(press('k')).toBe(true);
		expect(linkShortcuts).toHaveLength(1);
		// Z undoes the last change: the underline.
		expect(press('z')).toBe(true);
		expect(
			(editor.getJSON().content?.[0].content?.[0].marks ?? []).map((mark) => mark.type).sort()
		).toEqual(['bold', 'italic']);
	});
});

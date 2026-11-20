import { describe, expect, it } from 'vitest';
import {
	buildArticleRichText,
	buildRichText,
	richTextBlocksText,
	richTextToc,
	safeRichTextHref,
	slugifyHeading,
	type RichTextBlock,
	type RichTextDoc
} from '.';

const heading = (text: string, attrs: Record<string, unknown> = {}) => ({
	type: 'heading',
	attrs,
	text
});
const paragraph = (text: string) => ({ type: 'paragraph', text });
const headingsOf = (blocks: RichTextBlock[]) =>
	blocks
		.filter((block) => block.kind === 'heading')
		.map((block) => block.kind === 'heading' && block);

describe('shared::lib::rich-text', () => {
	it('common v2 §B (app = web): a heading’s id is its CMS anchor, else the slug of its words; a duplicate is numbered', () => {
		const { blocks, headings } = buildRichText({
			content: [
				heading('Διαδικασία ραντεβού', { level: 2, anchor: 'booking' }),
				heading('Τι ισχύει', { level: 2 }),
				heading('Τι ισχύει', { level: 2 }),
				heading('Μια ενότητα', { level: 2, anchor: 'Not Clean!' })
			]
		});
		expect(headings.map((entry) => entry.id)).toEqual([
			'booking',
			'τι-ισχυει',
			'τι-ισχυει-2',
			'μια-ενοτητα'
		]);
		expect(headingsOf(blocks).map((block) => block && block.id)).toEqual(
			headings.map((entry) => entry.id)
		);
	});

	it('common v2 §B: the ToC and the body share ONE set of ids, across several documents read as one', () => {
		const first: RichTextDoc = { content: [heading('Εισαγωγή', { level: 2 })] };
		const second: RichTextDoc = { content: [heading('Εισαγωγή', { level: 2 })] };
		const { blocks, headings } = buildRichText([first, second]);
		const toc = richTextToc(headings);
		expect(toc.map((entry) => entry.id)).toEqual(['εισαγωγη', 'εισαγωγη-2']);
		expect(headingsOf(blocks).map((block) => block && block.id)).toEqual(
			toc.map((entry) => entry.id)
		);
	});

	it('common v2 §B: a plain `{ type, text }` heading (no `attrs`) is the body’s first level, 2; levels clamp to 2–4', () => {
		const { headings } = buildRichText({
			content: [
				{ type: 'heading', text: 'Χωρίς επίπεδο' },
				heading('Πρώτο', { level: 1 }),
				heading('Βαθύ', { level: 6 }),
				heading('Τρίτο', { level: 3 })
			]
		});
		expect(headings.map((entry) => entry.level)).toEqual([2, 2, 4, 3]);
		expect(richTextToc(headings).map((entry) => entry.label)).toEqual(['Χωρίς επίπεδο', 'Πρώτο']);
	});

	it('U-60.1: a heading keeps the CMS’s short name (`attrs.label`) and its «popular» mark (`attrs.popular`)', () => {
		const { blocks } = buildRichText({
			content: [
				heading('Διαδικασία ραντεβού', { level: 2, anchor: 'booking', label: 'Ραντεβού' }),
				heading('Πώς ακυρώνω;', { level: 3, popular: true }),
				heading('Άλλη ερώτηση;', { level: 3, popular: 'yes' })
			]
		});
		expect(headingsOf(blocks).map((block) => block && [block.label, block.popular])).toEqual([
			['Ραντεβού', false],
			[null, true],
			[null, false]
		]);
	});

	it('common v2 §B: only https, http, mailto, tel and a path of this site are links', () => {
		expect(safeRichTextHref('https://example.org/a')).toEqual({
			href: 'https://example.org/a',
			external: true
		});
		expect(safeRichTextHref('mailto:support@example.org')).toEqual({
			href: 'mailto:support@example.org',
			external: false
		});
		expect(safeRichTextHref('tel:+302100000000')?.external).toBe(false);
		expect(safeRichTextHref('/legal/terms-of-use')).toEqual({
			href: '/legal/terms-of-use',
			external: false
		});
	});

	it('common v2 §B (negative): a script, data, protocol-relative or backslash address is NOT a link — its words stay text', () => {
		for (const unsafe of [
			'javascript:alert(1)',
			'JavaScript:alert(1)',
			'data:text/html,<b>x</b>',
			'//evil.example',
			'/\\evil.example',
			'vbscript:x',
			'relative/path',
			'#fragment',
			'',
			42
		]) {
			expect(safeRichTextHref(unsafe), String(unsafe)).toBeNull();
		}
		const { blocks } = buildRichText({
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Πατήστε ' },
						{
							type: 'text',
							text: 'εδώ',
							marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]
						}
					]
				}
			]
		});
		const [block] = blocks;
		expect(block.kind === 'paragraph' && block.spans.every((span) => span.link === null)).toBe(
			true
		);
		expect(richTextBlocksText(blocks)).toBe('Πατήστε εδώ');
	});

	it('common v2 §B (negative): markup in the words stays words — never an element', () => {
		const { blocks } = buildRichText({ content: [paragraph('<img src=x onerror=alert(1)>')] });
		expect(richTextBlocksText(blocks)).toBe('<img src=x onerror=alert(1)>');
	});

	it('U-57.4 (app = web): a heading’s slug is the application’s `toAnchorSlug` — the same cases give the same ids', () => {
		expect(slugifyHeading('Τι είναι το edoctor;')).toBe('τι-ειναι-το-edoctor');
		expect(slugifyHeading('  Heart & Health: 5 habits!  ')).toBe('heart-health-5-habits');
		expect(slugifyHeading('???')).toBe('section');
		expect(slugifyHeading('α'.repeat(200))).toHaveLength(80);
		expect(slugifyHeading('Πώς Μπορώ να Ακυρώσω;')).toBe('πως-μπορω-να-ακυρωσω');
	});

	it('U-57.4 (app = web, negative): an authored anchor outside the application’s pattern is not an id — the slug is', () => {
		const ids = (anchor: string) =>
			buildRichText({
				content: [{ type: 'heading', attrs: { level: 2, anchor }, text: 'Ακύρωση' }]
			}).headings.map((heading) => heading.id);
		expect(ids('cancellation')).toEqual(['cancellation']);
		expect(ids('double--dash')).toEqual(['ακυρωση']);
		expect(ids('-start')).toEqual(['ακυρωση']);
		expect(ids('a'.repeat(81))).toEqual(['ακυρωση']);
	});
});

describe('shared::lib::rich-text · the closed schema of an article (D-W52-104)', () => {
	const IMAGE = '0199aaaa-0000-7000-8000-000000000001';
	const images = (id: string) =>
		id === IMAGE ? { url: 'https://cdn.example.org/l.webp', width: 1200, height: 800 } : null;
	const text = (words: string, marks?: { type: string; attrs?: Record<string, unknown> }[]) => ({
		type: 'text',
		text: words,
		...(marks ? { marks } : {})
	});
	const para = (...content: ReturnType<typeof text>[] | { type: string }[]) => ({
		type: 'paragraph',
		content
	});

	it('🔴 D-W52-104: every node of the list has its own block — heading 2 / 3, lists (with `start`), quote, «Σημαντικό», rule, image, video, table', () => {
		const { blocks, headings } = buildArticleRichText(
			{
				type: 'doc',
				content: [
					{ type: 'heading', attrs: { level: 2 }, content: [text('Οι τιμές')] },
					{ type: 'heading', attrs: { level: 3 }, content: [text('Στο σπίτι')] },
					para(text('Λέξη')),
					{
						type: 'orderedList',
						attrs: { start: 3, type: null },
						content: [{ type: 'listItem', content: [para(text('Τρίτο'))] }]
					},
					{ type: 'blockquote', content: [para(text('Παράθεμα'))] },
					{ type: 'callout', content: [para(text('Σημαντικό'))] },
					{ type: 'horizontalRule' },
					{ type: 'image', attrs: { imageId: IMAGE, alt: 'Πιεσόμετρο', caption: 'Λεζάντα' } },
					{ type: 'video', attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' } },
					{
						type: 'table',
						content: [
							{
								type: 'tableRow',
								content: [
									{ type: 'tableHeader', content: [para(text('Τιμή'))] },
									{ type: 'tableCell', content: [para(text('120'))] }
								]
							}
						]
					}
				]
			},
			images
		);
		expect(blocks.map((block) => block.kind)).toEqual([
			'heading',
			'heading',
			'paragraph',
			'list',
			'quote',
			'callout',
			'rule',
			'image',
			'video',
			'table'
		]);
		expect(headings.map((heading) => [heading.id, heading.level])).toEqual([
			['οι-τιμες', 2],
			['στο-σπιτι', 3]
		]);
		expect(blocks[3]).toMatchObject({ kind: 'list', ordered: true, start: 3 });
		expect(blocks[7]).toMatchObject({
			kind: 'image',
			url: 'https://cdn.example.org/l.webp',
			alt: 'Πιεσόμετρο',
			caption: 'Λεζάντα',
			width: 1200
		});
		expect(blocks[8]).toMatchObject({
			kind: 'video',
			name: 'YouTube',
			embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0'
		});
		const table = blocks[9];
		expect(table.kind === 'table' && table.rows[0].cells.map((cell) => cell.header)).toEqual([
			true,
			false
		]);
		expect(richTextBlocksText(blocks)).toContain('Παράθεμα');
	});

	it('🔴 D-W52-104: every mark — bold, italic, underline, strike, highlight, an `https:` link — and a line break', () => {
		const { blocks } = buildArticleRichText(
			{
				type: 'doc',
				content: [
					para(
						text('Α', [{ type: 'bold' }, { type: 'italic' }]),
						text('Β', [{ type: 'underline' }, { type: 'strike' }, { type: 'highlight' }]),
						{ type: 'hardBreak' },
						text('ΕΟΔΥ', [{ type: 'link', attrs: { href: 'https://eody.gov.gr/' } }])
					)
				]
			},
			images
		);
		const [block] = blocks;
		if (block.kind !== 'paragraph') throw new Error('not a paragraph');
		const runs = block.spans.flatMap((span) => span.runs);
		expect(runs[0]).toMatchObject({ text: 'Α', bold: true, italic: true });
		expect(runs[1]).toMatchObject({ text: 'Β', underline: true, strike: true, highlight: true });
		expect(runs[2]).toMatchObject({ break: true });
		expect(block.spans.at(-1)?.link).toEqual({ href: 'https://eody.gov.gr/', external: true });
	});

	it('🔴 D-W52-104 (negative): a node outside the list is NOT drawn — neither it nor its words; a non-https link is words; an unknown image or a broken video is nothing', () => {
		const { blocks } = buildArticleRichText(
			{
				type: 'doc',
				content: [
					{ type: 'iframe', content: [text('<script>alert(1)</script>')] },
					{ type: 'script', content: [text('alert(1)')] },
					para(text('Πατήστε', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])),
					para(text('http', [{ type: 'link', attrs: { href: 'http://evil.gr' } }])),
					{ type: 'image', attrs: { imageId: '0199aaaa-0000-7000-8000-0000000000ff', alt: 'x' } },
					{ type: 'video', attrs: { provider: 'youtube', id: '"><img onerror=x>' } },
					{ type: 'video', attrs: { provider: 'evil', id: 'dQw4w9WgXcQ' } }
				]
			},
			images
		);
		expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'paragraph']);
		expect(richTextBlocksText(blocks)).toBe('Πατήστε http');
		expect(
			blocks.every(
				(block) => block.kind === 'paragraph' && block.spans.every((span) => span.link === null)
			)
		).toBe(true);
	});
});

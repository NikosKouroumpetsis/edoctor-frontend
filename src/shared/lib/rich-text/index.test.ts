import { describe, expect, it } from 'vitest';
import {
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

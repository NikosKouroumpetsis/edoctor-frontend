import { describe, expect, it } from 'vitest';
import {
	ARTICLE_TEXT_LIMITS,
	articleLinkIssue,
	articleTextHasWords,
	articleTextOverLimit,
	articleTextStats,
	articleVideoEmbedUrl,
	cleanArticleTextDoc,
	cleanArticleTextRun,
	readArticleText,
	readArticleVideoUrl
} from '.';

const text = (words: string, marks?: unknown[]) => ({
	type: 'text',
	text: words,
	...(marks ? { marks } : {})
});
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content });
const doc = (...content: unknown[]) => ({ type: 'doc', content });
const IMAGE_ID = '0199aaaa-0000-7000-8000-000000000001';

/** Every node and mark of the closed list once (the server's «Άρθρο με όλα», `seed-article-everything`). */
const EVERYTHING = doc(
	{ type: 'heading', attrs: { level: 2 }, content: [text('Πριν από τη μέτρηση')] },
	{ type: 'heading', attrs: { level: 3 }, content: [text('Υπότιτλος')] },
	paragraph(
		text('Έντονα', [{ type: 'bold' }]),
		text(' πλάγια', [{ type: 'italic' }, { type: 'underline' }]),
		{ type: 'hardBreak' },
		text('διαγραφή', [{ type: 'strike' }, { type: 'highlight' }]),
		text('ΕΟΔΥ', [{ type: 'link', attrs: { href: 'https://eody.gov.gr/' } }])
	),
	{
		type: 'bulletList',
		content: [{ type: 'listItem', content: [paragraph(text('Ένα'))] }]
	},
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
						content: [{ type: 'listItem', content: [paragraph(text('μέσα'))] }]
					}
				]
			}
		]
	},
	{ type: 'blockquote', content: [paragraph(text('Παράθεμα'))] },
	{ type: 'callout', content: [paragraph(text('Σημαντικό: καλέστε το 166.'))] },
	{ type: 'horizontalRule' },
	{ type: 'image', attrs: { imageId: IMAGE_ID, alt: 'Πιεσόμετρο', caption: null } },
	{ type: 'video', attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' } },
	{ type: 'video', attrs: { provider: 'vimeo', id: '76979871' } },
	{
		type: 'table',
		content: [
			{
				type: 'tableRow',
				content: [
					{
						type: 'tableHeader',
						attrs: { colspan: 1, rowspan: 1, colwidth: null },
						content: [paragraph(text('Τιμή'))]
					}
				]
			},
			{
				type: 'tableRow',
				content: [
					{
						type: 'tableCell',
						attrs: { colspan: 1, rowspan: 1, colwidth: null },
						content: [paragraph(text('120'))]
					}
				]
			}
		]
	}
);

describe('shared::lib::article-text (D-W52-99 / 103 / 104)', () => {
	it('🔴 D-W52-99: the limits are the server’s — 50.000 / 5.000 / 10 / 20 / 5 / 10', () => {
		expect(ARTICLE_TEXT_LIMITS).toMatchObject({
			characters: 50_000,
			nodes: 5_000,
			depth: 10,
			images: 20,
			videos: 5,
			tables: 10,
			hrefLength: 2_000
		});
	});

	it('🔴 U-222.4: only `https:` with a host is a link — `https:` passes', () => {
		expect(articleLinkIssue('https://eody.gov.gr/')).toBeNull();
		expect(articleLinkIssue('https://www.example.gr/a?b=1#c')).toBeNull();
	});

	it('🔴 U-222.4 (negative): `javascript:`, `http:`, `data:`, `//host`, a backslash, white space, a user, a control character — refused', () => {
		for (const href of [
			'javascript:alert(1)',
			'JavaScript:alert(1)',
			'http://holter-info.gr',
			'ftp://x.gr',
			'data:text/html,<b>',
			'vbscript:x'
		])
			expect(articleLinkIssue(href), href).toBe('not-https');
		for (const href of [
			'//evil.gr',
			'https:evil.gr',
			'https://evil.gr\\x',
			'https://a b.gr',
			'https://user:pass@evil.gr',
			'https://user@evil.gr',
			'https://evil.gr/\u0000',
			'holter-info.gr',
			'',
			`https://e.gr/${'a'.repeat(2000)}`,
			42
		])
			expect(articleLinkIssue(href), String(href)).toBe('invalid');
	});

	it('🔴 D-W52-103: a pasted YouTube / Vimeo address becomes its provider and id — never a frame', () => {
		expect(readArticleVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
			provider: 'youtube',
			id: 'dQw4w9WgXcQ'
		});
		expect(readArticleVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toMatchObject({
			id: 'dQw4w9WgXcQ'
		});
		expect(readArticleVideoUrl('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toMatchObject({
			provider: 'youtube'
		});
		expect(readArticleVideoUrl('https://vimeo.com/76979871')).toEqual({
			provider: 'vimeo',
			id: '76979871'
		});
	});

	it('🔴 D-W52-103 (negative): an unknown site, `http:`, an id out of its pattern — no video', () => {
		for (const url of [
			'https://evil.gr/watch?v=dQw4w9WgXcQ',
			'https://youtube.com.evil.gr/watch?v=dQw4w9WgXcQ',
			'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
			'https://www.youtube.com/watch?v=short',
			'https://www.youtube.com/watch?v=dQw4w9WgXc"',
			'https://vimeo.com/12345',
			'https://vimeo.com/abcdefg',
			'javascript:alert(1)',
			'<iframe src=x>'
		])
			expect(readArticleVideoUrl(url), url).toBeNull();
	});

	it('🔴 D-W52-104: the frame’s ONE address — YouTube without cookies, Vimeo with «do not track»; nothing for a broken id', () => {
		expect(articleVideoEmbedUrl({ provider: 'youtube', id: 'dQw4w9WgXcQ' })).toBe(
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0'
		);
		expect(articleVideoEmbedUrl({ provider: 'vimeo', id: '76979871' })).toBe(
			'https://player.vimeo.com/video/76979871?autoplay=1&dnt=1'
		);
		expect(articleVideoEmbedUrl({ provider: 'youtube', id: '"><script>' })).toBeNull();
	});

	it('🔴 D-W52-99: every node and mark of the closed list reads as one document', () => {
		expect(readArticleText(EVERYTHING)).toBe(EVERYTHING);
		expect(articleTextHasWords(EVERYTHING)).toBe(true);
		expect(articleTextStats(EVERYTHING)).toMatchObject({ images: 1, videos: 2, tables: 1 });
	});

	it('🔴 U-222.4 (negative): an unknown node, mark or attribute, `__proto__`, a misplaced child — not a document of the schema', () => {
		const planted = [
			doc({ type: 'iframe', attrs: { src: 'https://evil.gr' } }),
			doc({ type: 'codeBlock', content: [text('x')] }),
			doc(paragraph(text('x', [{ type: 'textStyle', attrs: { color: 'red' } }]))),
			doc(paragraph(text('x', [{ type: 'highlight', attrs: { color: '#f00' } }]))),
			doc(
				paragraph(text('x', [{ type: 'link', attrs: { href: 'https://a.gr', target: '_blank' } }]))
			),
			doc(paragraph(text('x', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]))),
			doc({ type: 'heading', attrs: { level: 1 }, content: [text('x')] }),
			doc({ type: 'paragraph', attrs: { style: 'x' } }),
			doc({ type: 'image', attrs: { imageId: IMAGE_ID, alt: 'x', src: 'https://evil.gr/p.png' } }),
			doc({ type: 'image', attrs: { imageId: IMAGE_ID, alt: '' } }),
			doc({ type: 'video', attrs: { provider: 'dailymotion', id: 'x' } }),
			doc({ type: 'orderedList', attrs: { start: 0, type: null }, content: [] }),
			doc({
				type: 'bulletList',
				content: [{ type: 'listItem', content: [{ type: 'bulletList', content: [] }] }]
			}),
			doc(text('x')),
			doc({ type: 'tableCell', content: [paragraph(text('x'))] }),
			JSON.parse('{"type":"doc","content":[{"type":"paragraph","__proto__":{"x":1}}]}'),
			{ type: 'doc', content: [paragraph(text('x\u0000'))] },
			{ type: 'html', content: [] },
			'<p>x</p>',
			null
		];
		for (const value of planted) expect(readArticleText(value), JSON.stringify(value)).toBeNull();
	});

	it('🔴 D-W52-99 (limits): a depth of 11 passes the limit; videos and characters are counted as the server counts them', () => {
		expect(articleTextStats(doc(paragraph(text('x')))).depth).toBe(3);
		const deep = { type: 'doc', content: [{ type: 'blockquote', content: [] as unknown[] }] };
		let at = deep.content[0];
		for (let level = 0; level < 9; level += 1) {
			const next = { type: 'blockquote', content: [] as unknown[] };
			at.content.push(next);
			at = next;
		}
		expect(articleTextStats(deep).depth).toBe(11);
		expect(articleTextOverLimit(articleTextStats(deep))).toBe('depth');
		const videos = doc(
			...Array.from({ length: 6 }, () => ({
				type: 'video',
				attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' }
			}))
		);
		expect(articleTextOverLimit(articleTextStats(videos))).toBe('videos');
		expect(readArticleText(videos)).toBeNull();
		const many = doc(paragraph(text('α'.repeat(50_001))));
		expect(articleTextOverLimit(articleTextStats(many))).toBe('characters');
	});

	it('U-222.4: a text node as the server stores it — tabs and line breaks a space, control characters and bidi gone, NFC', () => {
		expect(cleanArticleTextRun('α\tβ\nγ\u0007δ‮ε')).toBe('α β γδε');
		expect(cleanArticleTextRun('é')).toBe('é');
	});
	it('🔴 D-W52-103: the editor’s document as the server takes it — each text cleaned, an empty run dropped, only the schema’s keys; nothing to send ⇒ `null`', () => {
		expect(
			cleanArticleTextDoc(
				doc(
					{ ...paragraph(text('α\tβ'), text('\u0007'), text('γ', [{ type: 'bold' }])), extra: 1 },
					{ type: 'paragraph' },
					{ type: 'horizontalRule', attrs: {} }
				)
			)
		).toEqual(
			doc(
				paragraph(text('α β'), text('γ', [{ type: 'bold' }])),
				{ type: 'paragraph' },
				{ type: 'horizontalRule' }
			)
		);
		expect(cleanArticleTextDoc(doc({ type: 'paragraph' }, paragraph(text('  '))))).toBeNull();
		expect(cleanArticleTextDoc(null)).toBeNull();
		expect(cleanArticleTextDoc({ type: 'paragraph' })).toBeNull();
		// A text of a rule or a video alone is a text to send (the server says whether it has words).
		expect(
			cleanArticleTextDoc(doc({ type: 'video', attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' } }))
		).not.toBeNull();
	});
});

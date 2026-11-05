import { describe, expect, it } from 'vitest';
import type { ArticlePublicView } from '$modules/articles/api/types';
import {
	authorName,
	buildHomeArticle,
	buildStreamedHomeArticles,
	cardReadingMinutes,
	extractPlainText,
	readingMinutes
} from '.';

const words = (count: number) =>
	Array.from({ length: count }, (_, index) => `λέξη${index}`).join(' ');

describe('articles::lib::article-card', () => {
	it('U-57.5 Ε3 (app = web; αντικαθιστά το στρογγύλεμα του U-20): 200 words a minute, ROUNDED UP, at least one; none without a body', () => {
		expect(readingMinutes({ content: [{ type: 'paragraph', text: words(1000) }] })).toBe(5);
		expect(readingMinutes({ content: [{ type: 'paragraph', text: words(20) }] })).toBe(1);
		expect(readingMinutes({ content: [{ type: 'paragraph', text: words(200) }] })).toBe(1);
		expect(readingMinutes({ content: [{ type: 'paragraph', text: words(201) }] })).toBe(2);
		expect(readingMinutes({ content: [{ type: 'paragraph', text: words(1210) }] })).toBe(7);
		expect(readingMinutes(null)).toBe(0);
	});

	it('U-57.4: several documents (an article\u2019s sections) are counted as ONE text', () => {
		const half = { content: [{ type: 'paragraph', text: words(150) }] };
		expect(readingMinutes([half, half])).toBe(2);
		expect(readingMinutes([null, half])).toBe(1);
	});

	it('U-20: reads both rich-text dialects (`content` and `children`, `blocks`)', () => {
		expect(
			extractPlainText({
				content: [{ content: [{ text: 'Πρώτη' }, { children: [{ text: ' δεύτερη ' }] }] }],
				blocks: [{ text: 'τρίτη' }]
			})
		).toBe('Πρώτη δεύτερη τρίτη');
	});

	it('U-20: the author is the primary one, else the first with a name', () => {
		expect(authorName([{ name: 'Α' }, { name: 'Β', isPrimary: true }])).toBe('Β');
		expect(authorName([{ name: null }, { name: 'Γ' }])).toBe('Γ');
		expect(authorName(null)).toBeNull();
	});

	it('U-20 / U-57.5 Ε3: the home card — «συγγραφέας · N΄ ανάγνωσης» (the minutes never part from their word), the photo or none', () => {
		const article = buildHomeArticle(
			{
				id: 'a1',
				slug: 'kardia',
				title: 'Η υγεία της καρδιάς',
				readingMinutes: 2,
				authors: [{ name: 'Δρ. Μαρία Παπαδοπούλου', isPrimary: true }],
				image: { mediumSizeUrl: 'https://cdn.example.com/a.jpg' }
			},
			'el'
		);
		expect(article).toEqual({
			id: 'a1',
			slug: 'kardia',
			title: 'Η υγεία της καρδιάς',
			meta: 'Δρ. Μαρία Παπαδοπούλου · 2΄\u00a0ανάγνωσης',
			imageUrl: 'https://cdn.example.com/a.jpg'
		});
		const bare = buildHomeArticle({ id: 'a2', slug: 's', title: 'Τ', image: null }, 'el');
		expect(bare.meta).toBe('');
		expect(bare.imageUrl).toBeNull();
	});
});

// 🔴 U-32.9: the builder runs inside the streamed chain on the server; a throw there must never reject it.
describe('articles::lib::article-card (the streamed row, U-32.9)', () => {
	const article: ArticlePublicView = {
		id: 'a1',
		slug: 'arthro',
		title: 'Άρθρο',
		authors: [{ name: 'Δρ. Μαρία', isPrimary: true }],
		image: null
	};

	it('U-32.9: an article the builder cannot write, or a feed that rejected after all, is the failed feed (no row) — never a rejection', async () => {
		const rejections: unknown[] = [];
		const record = (reason: unknown) => rejections.push(reason);
		process.on('unhandledRejection', record);
		try {
			const odd = { ...article, authors: {} } as unknown as ArticlePublicView;
			await expect(
				buildStreamedHomeArticles(Promise.resolve({ status: 'ok', articles: [odd] }), 'el')
			).resolves.toEqual({ status: 'error' });
			await expect(
				buildStreamedHomeArticles(Promise.reject(new Error('rejected after all')), 'el')
			).resolves.toEqual({ status: 'error' });
			await new Promise((resolve) => setTimeout(resolve, 10));
		} finally {
			process.off('unhandledRejection', record);
		}
		expect(rejections).toEqual([]);
	});

	it('U-32.9: the usual way is as before — the cards in the page’s language; a failed feed stays the error', async () => {
		await expect(
			buildStreamedHomeArticles(Promise.resolve({ status: 'ok', articles: [article] }), 'el')
		).resolves.toEqual({
			status: 'ok',
			articles: [buildHomeArticle(article, 'el')]
		});
		await expect(
			buildStreamedHomeArticles(Promise.resolve({ status: 'error' }), 'el')
		).resolves.toEqual({ status: 'error' });
	});

	it('U-92: a card’s time is the server’s `readingMinutes`, `null` shows none, and a body is never counted', () => {
		const base = {
			id: 'a',
			slug: 'a',
			title: 'Τίτλος',
			authors: [{ name: 'Δρ. Α', isPrimary: true }]
		};
		expect(buildHomeArticle({ ...base, readingMinutes: 7 }, 'el').meta).toBe(
			'Δρ. Α · 7΄\u00a0ανάγνωσης'
		);
		expect(buildHomeArticle({ ...base, readingMinutes: null }, 'el').meta).toBe('Δρ. Α');
		expect(buildHomeArticle(base, 'el').meta).toBe('Δρ. Α');
		// A body that somehow travelled changes nothing: the card reads only the server's number.
		expect(
			buildHomeArticle(
				{ ...base, readingMinutes: null, content: { content: [{ text: words(400) }] } },
				'el'
			).meta
		).toBe('Δρ. Α');
		expect(cardReadingMinutes({ readingMinutes: -1 })).toBe(0);
		expect(cardReadingMinutes({ readingMinutes: Number.NaN })).toBe(0);
	});
});

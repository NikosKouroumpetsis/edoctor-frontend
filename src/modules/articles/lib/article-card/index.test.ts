import { describe, expect, it } from 'vitest';
import type { ArticlePublicView } from '$modules/articles/api/types';
import {
	authorName,
	buildHomeArticle,
	buildStreamedHomeArticles,
	extractPlainText,
	readingMinutes
} from '.';

const words = (count: number) =>
	Array.from({ length: count }, (_, index) => `λέξη${index}`).join(' ');

describe('articles::lib::article-card', () => {
	it('U-20: the reading time is the application’s — 200 words a minute, rounded, at least one; none without a body', () => {
		expect(readingMinutes({ content: [{ type: 'paragraph', text: words(1000) }] })).toBe(5);
		expect(readingMinutes({ content: [{ type: 'paragraph', text: words(20) }] })).toBe(1);
		expect(readingMinutes({ content: [{ type: 'paragraph', text: words(299) }] })).toBe(1);
		expect(readingMinutes({ content: [{ type: 'paragraph', text: words(300) }] })).toBe(2);
		expect(readingMinutes(null)).toBe(0);
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

	// Live r1 (3): «1΄ / ανάγνωση» broke over two lines; the number and its word are held by a no-break space.
	it('U-20: the home card — «συγγραφέας · χρόνος ανάγνωσης» (the minutes never part from «ανάγνωση»), the photo or none', () => {
		const article = buildHomeArticle(
			{
				id: 'a1',
				slug: 'kardia',
				title: 'Η υγεία της καρδιάς',
				content: { content: [{ text: words(400) }] },
				authors: [{ name: 'Δρ. Μαρία Παπαδοπούλου', isPrimary: true }],
				image: { mediumSizeUrl: 'https://cdn.example.com/a.jpg' }
			},
			'el'
		);
		expect(article).toEqual({
			id: 'a1',
			slug: 'kardia',
			title: 'Η υγεία της καρδιάς',
			meta: 'Δρ. Μαρία Παπαδοπούλου · 2΄\u00a0ανάγνωση',
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
});

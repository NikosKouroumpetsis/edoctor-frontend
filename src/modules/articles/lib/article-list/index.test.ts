import { describe, expect, it } from 'vitest';
import type { ArticlePublicView, ArticlesPage } from '$modules/articles/api/types';
import {
	articleTypeFromParam,
	articleTypeParam,
	buildArticleListCard,
	buildArticlesListView
} from '.';

const words = (count: number) => Array.from({ length: count }, (_, n) => `λέξη${n}`).join(' ');

const article = (overrides: Partial<ArticlePublicView> & { slug: string }): ArticlePublicView => ({
	id: overrides.slug,
	title: `Τίτλος ${overrides.slug}`,
	type: 'ARTICLE',
	content: { content: [{ type: 'paragraph', text: words(760) }] },
	shortDescription: { content: [{ type: 'paragraph', text: 'Η σύντομη περιγραφή.' }] },
	authors: [{ name: 'Dr. Eva Kalogeropoulou', isPrimary: true, slug: 'eva' }],
	image: null,
	...overrides
});

const page = (articles: ArticlePublicView[], meta: Partial<ArticlesPage> = {}): ArticlesPage => ({
	articles,
	nextCursor: null,
	total: null,
	appliedService: null,
	...meta
});

describe('articles::lib::article-list', () => {
	it('U-57.2: the address speaks `?type=article|advice`; anything else is «Όλα»', () => {
		expect(articleTypeFromParam('article')).toBe('ARTICLE');
		expect(articleTypeFromParam('advice')).toBe('HEALTH_ADVICE');
		expect(articleTypeFromParam('ARTICLE')).toBeNull();
		expect(articleTypeFromParam(null)).toBeNull();
		expect(articleTypeParam('HEALTH_ADVICE')).toBe('advice');
		expect(articleTypeParam(null)).toBeNull();
	});

	it('U-57.2 (app = web): a card — «συγγραφέας · N΄ ανάγνωσης» (rounded up), the kind, two lines of the short description', () => {
		const card = buildArticleListCard(
			article({ slug: 'nero', type: 'HEALTH_ADVICE', publishedAt: '2026-07-05T06:00:00.000Z' }),
			'el'
		);
		expect(card.meta).toBe('Dr. Eva Kalogeropoulou · 4΄ ανάγνωσης');
		expect(card.typeLabel).toBe('Συμβουλή υγείας');
		expect(card.excerpt).toBe('Η σύντομη περιγραφή.');
		expect(card.featuredMeta).toBe('Από Dr. Eva Kalogeropoulou · 5 Ιουλ 2026 · 4΄ ανάγνωσης');
	});

	it('U-57.5 Ε4 (app = web, negative): a doctor the marketplace hides comes without a name — only the time, no «Από»', () => {
		const card = buildArticleListCard(
			article({ slug: 'hidden', authors: [{ name: null, slug: null, doctorId: null }] }),
			'el'
		);
		expect(card.meta).toBe('4΄ ανάγνωσης');
		expect(card.featuredMeta).not.toContain('Από');
	});

	it('U-57.2 / U-57.5 Ε1: the newest of the first page is featured over the grid, never twice', () => {
		const view = buildArticlesListView({
			pages: [
				page([
					article({ slug: 'a', publishedAt: '2026-06-01T00:00:00.000Z' }),
					article({ slug: 'b', publishedAt: '2026-07-10T00:00:00.000Z' }),
					article({ slug: 'c', publishedAt: null })
				])
			],
			locale: 'el',
			query: null,
			searching: false,
			hasMore: false
		});
		expect(view.featured?.slug).toBe('b');
		expect(view.cards.map((card) => card.slug)).toEqual(['a', 'c']);
		expect(view.countLabel).toBeNull();
	});

	it('U-57.3 (negative): while searching there is NO featured article; the line counts the backend’s total', () => {
		const view = buildArticlesListView({
			pages: [
				page([article({ slug: 'a' }), article({ slug: 'b' })], {
					total: 14,
					nextCursor: 'b'
				})
			],
			locale: 'el',
			query: 'αιμα',
			searching: true,
			hasMore: true
		});
		expect(view.featured).toBeNull();
		expect(view.cards).toHaveLength(2);
		expect(view.countLabel).toBe('14 αποτελέσματα για «αιμα»');
	});

	it('U-57.3: a service alone names the line with its name; one match is singular; an unknown total says nothing while more wait', () => {
		const service = {
			id: '0199a0a0-0000-7000-8000-000000000001',
			name: 'Διατροφική συμβουλευτική'
		};
		const one = buildArticlesListView({
			pages: [page([article({ slug: 'a' })], { total: 1, appliedService: service })],
			locale: 'el',
			query: null,
			searching: true,
			hasMore: false
		});
		expect(one.countLabel).toBe('1 αποτέλεσμα για «Διατροφική συμβουλευτική»');
		expect(one.appliedService).toEqual(service);
		const unknown = buildArticlesListView({
			pages: [page([article({ slug: 'a' })], { nextCursor: 'a' })],
			locale: 'el',
			query: 'καρδια',
			searching: true,
			hasMore: true
		});
		expect(unknown.countLabel).toBeNull();
	});
});

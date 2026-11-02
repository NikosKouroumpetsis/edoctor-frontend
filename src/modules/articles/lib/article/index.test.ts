import { describe, expect, it } from 'vitest';
import type { ResolvedPathname } from '$app/types';
import type { ArticlePublicView } from '$modules/articles/api/types';
import {
	RELATED_ARTICLES_SHOWN,
	articleBodyDocs,
	buildArticleAuthor,
	buildArticlePage,
	buildArticleSeo,
	buildRelatedArticles
} from '.';

const doctorHref = (slug: string) => `/doctors/${slug}` as ResolvedPathname;
const words = (count: number) => Array.from({ length: count }, (_, n) => `λέξη${n}`).join(' ');

const base = (overrides: Partial<ArticlePublicView> = {}): ArticlePublicView => ({
	id: 'a1',
	slug: 'aimatologikes',
	title: 'Πώς να διαβάσετε τις αιματολογικές σας εξετάσεις',
	type: 'ARTICLE',
	publishedAt: '2026-07-10T08:30:00.000Z',
	shortDescription: { content: [{ type: 'paragraph', text: 'Μια απλή εξέταση.' }] },
	sections: [
		{
			id: 's2',
			type: 'text',
			order: 2,
			content: { content: [{ type: 'heading', attrs: { level: 2 }, text: 'Δεύτερη' }] }
		},
		{ id: 's0', type: 'image', order: 0, content: null },
		{
			id: 's1',
			type: 'text',
			order: 1,
			content: {
				content: [
					{ type: 'heading', attrs: { level: 2, anchor: 'geniki-aimatos' }, text: 'Πρώτη' },
					{ type: 'paragraph', text: words(980) }
				]
			}
		}
	],
	authors: [{ id: 'au', name: 'Dr. Athena Papadopoulou', slug: 'athena', isPrimary: true }],
	image: { lgSizeUrl: 'https://cdn.example.com/a.jpg', alt: 'Σωληνάρια' },
	...overrides
});

describe('articles::lib::article', () => {
	it('U-57.4: the body is the text sections in their order; the ToC their H2s with the body’s ids', () => {
		const article = base();
		expect(articleBodyDocs(article)).toHaveLength(2);
		const view = buildArticlePage({ article, related: null, locale: 'el', doctorHref });
		expect(view.toc).toEqual([
			{ id: 'geniki-aimatos', label: 'Πρώτη' },
			{ id: 'δευτερη', label: 'Δεύτερη' }
		]);
		expect(view.reading).toBe('5΄ ανάγνωσης');
		expect(view.subtitle).toBe('Μια απλή εξέταση.');
		expect(view.typePluralLabel).toBe('Άρθρα');
		expect(view.date).toBe('10 Ιουλ 2026');
	});

	it('U-57.4 (app = web): the author’s name links the profile ONLY with the slug the backend gives', () => {
		expect(buildArticleAuthor(base().authors, doctorHref)).toEqual({
			name: 'Dr. Athena Papadopoulou',
			href: '/doctors/athena',
			initial: 'A'
		});
		expect(
			buildArticleAuthor([{ name: 'Δρ. Νίκος Ιωάννου', slug: null, isPrimary: true }], doctorHref)
		).toEqual({ name: 'Δρ. Νίκος Ιωάννου', href: null, initial: 'Ν' });
	});

	it('U-57.5 Ε4 (app = web, negative): a doctor the marketplace hides (no name) is no author at all — no name, no link, no card', () => {
		expect(buildArticleAuthor([{ name: null, slug: null, doctorId: null }], doctorHref)).toBeNull();
		const view = buildArticlePage({
			article: base({ authors: [{ name: null, slug: null }] }),
			related: null,
			locale: 'el',
			doctorHref
		});
		expect(view.author).toBeNull();
	});

	it('U-57.4 (the prototype’s Π11): «Περισσότερα άρθρα» — three, the same kind first, the newest first, never the article itself', () => {
		const current = base();
		const related = [
			base({ id: 'x', slug: 'aimatologikes' }),
			base({
				id: 'o1',
				slug: 'advice-new',
				type: 'HEALTH_ADVICE',
				publishedAt: '2026-08-01T00:00:00.000Z'
			}),
			base({ id: 'o2', slug: 'article-old', publishedAt: '2026-01-01T00:00:00.000Z' }),
			base({ id: 'o3', slug: 'article-new', publishedAt: '2026-07-20T00:00:00.000Z' }),
			base({
				id: 'o4',
				slug: 'advice-old',
				type: 'HEALTH_ADVICE',
				publishedAt: '2026-02-01T00:00:00.000Z'
			})
		];
		const cards = buildRelatedArticles(related, current, 'el');
		expect(RELATED_ARTICLES_SHOWN).toBe(3);
		expect(cards.map((card) => card.slug)).toEqual(['article-new', 'article-old', 'advice-new']);
		expect(buildRelatedArticles(null, current, 'el')).toEqual([]);
	});

	it('U-28.4 (common v2): «<τίτλος> | eDoctor», og `article`, a JSON-LD `Article` with the day and the named author', () => {
		const seo = buildArticleSeo({
			article: base(),
			locale: 'el',
			canonicalUrl: 'https://edoctor.gr/articles/aimatologikes',
			alternateUrls: {
				el: 'https://edoctor.gr/articles/aimatologikes',
				en: 'https://edoctor.gr/en/articles/aimatologikes'
			}
		});
		expect(seo.title).toBe('Πώς να διαβάσετε τις αιματολογικές σας εξετάσεις | eDoctor');
		expect(seo.description).toBe('Μια απλή εξέταση.');
		expect(seo.jsonLd).toMatchObject({
			'@type': 'Article',
			datePublished: '2026-07-10T08:30:00.000Z',
			author: { '@type': 'Person', name: 'Dr. Athena Papadopoulou' }
		});
		expect(seo.alternates.map((entry) => entry.hreflang)).toEqual(['el', 'en', 'x-default']);
	});
});

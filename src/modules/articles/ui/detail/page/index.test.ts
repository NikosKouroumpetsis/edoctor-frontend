import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import type { ResolvedPathname } from '$app/types';
import type { ArticlePublicView } from '$modules/articles/api';
import type { ArticleDetailProps } from '../types';
import ArticleDetail from './index.svelte';

const article = (overrides: Partial<ArticlePublicView> = {}): ArticlePublicView => ({
	id: 'a1',
	slug: 'aimatologikes',
	title: 'Πώς να διαβάσετε τις αιματολογικές σας εξετάσεις',
	type: 'ARTICLE',
	publishedAt: '2026-07-10T08:30:00.000Z',
	shortDescription: { content: [{ type: 'paragraph', text: 'Μια απλή εξέταση.' }] },
	sections: [
		{
			id: 's1',
			type: 'text',
			order: 1,
			content: {
				content: [
					{ type: 'heading', attrs: { level: 2 }, text: 'Γενική αίματος' },
					{ type: 'paragraph', text: 'Κείμενο.' },
					{ type: 'heading', attrs: { level: 2 }, text: 'Πότε ανησυχούμε' },
					{ type: 'paragraph', text: 'Κι άλλο κείμενο.' }
				]
			}
		}
	],
	authors: [{ id: 'au', name: 'Δρ. Αθηνά Παπαδοπούλου', slug: 'athena', isPrimary: true }],
	image: null,
	...overrides
});

const props = (overrides: Partial<ArticleDetailProps> = {}): ArticleDetailProps => ({
	article: article(),
	related: null,
	locale: 'el',
	listHref: '/articles' as ResolvedPathname,
	kindHref: '/articles?type=article' as ResolvedPathname,
	articleHref: (slug) => `/articles/${slug}` as ResolvedPathname,
	doctorHref: (slug) => `/doctors/${slug}` as ResolvedPathname,
	internalHref: (path) => path,
	canonicalUrl: 'https://www.example.org/articles/aimatologikes',
	alternateUrls: {
		el: 'https://www.example.org/articles/aimatologikes',
		en: 'https://www.example.org/en/articles/aimatologikes'
	},
	...overrides
});

afterEach(() => {
	document.head.innerHTML = '';
});

describe('articles::ui::detail', () => {
	it('U-57.4 (the prototype 06 Π5–Π9): «Άρθρα υγείας › Άρθρα», ONE h1, «Από <γιατρός>» to the profile, «Κοινοποίηση»', () => {
		render(ArticleDetail, { props: props() });
		const crumbs = screen.getByRole('navigation', { name: 'Διαδρομή' });
		expect(
			within(crumbs)
				.getAllByRole('link')
				.map((link) => [link.textContent, link.getAttribute('href')])
		).toEqual([
			['Άρθρα υγείας', '/articles'],
			['Άρθρα', '/articles?type=article']
		]);
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getByTestId('article-meta-author')).toHaveAttribute('href', '/doctors/athena');
		expect(screen.getByTestId('article-share')).toHaveTextContent('Κοινοποίηση');
		const [author] = screen.getAllByTestId('article-author');
		expect(within(author).getByTestId('article-author-book')).toHaveAttribute(
			'href',
			'/doctors/athena'
		);
	});

	it('U-57.4 Ε4 (negative): a doctor the marketplace hides is a name only — no link, no «Κλείστε ραντεβού»', () => {
		render(ArticleDetail, {
			props: props({
				article: article({
					authors: [{ id: 'au', name: 'Δρ. Αθηνά Παπαδοπούλου', slug: null, isPrimary: true }]
				})
			})
		});
		expect(screen.queryByTestId('article-meta-author')).not.toBeInTheDocument();
		expect(screen.queryByTestId('article-author-name')).not.toBeInTheDocument();
		expect(screen.queryByTestId('article-author-book')).not.toBeInTheDocument();
		expect(screen.getAllByText('Δρ. Αθηνά Παπαδοπούλου').length).toBeGreaterThan(0);
	});

	it('U-57.4: the text’s headings carry the ids its «Σε αυτό το άρθρο» links to', () => {
		render(ArticleDetail, { props: props() });
		const body = screen.getByTestId('article-body');
		expect(
			within(body)
				.getAllByRole('heading', { level: 2 })
				.map((heading) => heading.id)
		).toEqual(['γενικη-αιματος', 'ποτε-ανησυχουμε']);
	});

	it('U-28.4: the head names an article — og:type article and the JSON-LD `Article`', () => {
		render(ArticleDetail, { props: props() });
		expect(document.head.querySelector('meta[property="og:type"]')).toHaveAttribute(
			'content',
			'article'
		);
		expect(document.head.innerHTML).toContain('"@type":"Article"');
	});

	it('U-57.4 / MINOR-1 of r1: the meta reads «Από <γιατρός> · ημέρα · N΄ ανάγνωσης» — the « · » with its spaces', () => {
		const { container } = render(ArticleDetail, { props: props() });
		const meta = container.querySelector('[data-slot="document-page-meta"]') as HTMLElement;
		expect(meta.textContent?.replace(/[ \t\n]+/gu, ' ').trim()).toMatch(
			/^Από Δρ\. Αθηνά Παπαδοπούλου · 10 Ιουλ 2026 · 1΄\u00a0ανάγνωσης/u
		);
		const hidden = render(ArticleDetail, {
			props: props({ article: article({ authors: [] }) })
		});
		const plain = hidden.container.querySelector('[data-slot="document-page-meta"]') as HTMLElement;
		expect(plain.textContent?.trim()).toMatch(/^10 Ιουλ 2026 · 1΄\u00a0ανάγνωσης/u);
	});

	it('U-58.1 (the prototype 06 Π5, the application’s bar): below 744 the share sits in its 40 circle beside «‹»', () => {
		render(ArticleDetail, { props: props() });
		const share = screen.getByTestId('article-share-phone');
		expect(share).toHaveAttribute('data-appearance', 'tint');
		expect(share.innerHTML).toContain('size-control-sm');
	});
});

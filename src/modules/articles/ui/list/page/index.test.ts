import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import type { ResolvedPathname } from '$app/types';
import QueryHarness from '$shared/query/query.harness.svelte';
import type {
	ArticlePublicView,
	ArticlesFirstPageLoad,
	ArticlesListScope
} from '$modules/articles/api';
import type { ArticlesListHref, ArticlesListProps } from '../types';
import ArticlesList from './index.svelte';

const article = (index: number, publishedAt: string): ArticlePublicView => ({
	id: `a${index}`,
	slug: `arthro-${index}`,
	type: index % 2 === 0 ? 'ARTICLE' : 'HEALTH_ADVICE',
	title: `Άρθρο ${index}`,
	shortDescription: { type: 'doc', content: [{ type: 'paragraph', text: `Περίληψη ${index}.` }] },
	authors: [{ name: 'Δρ. Μαρία Παπαδοπούλου', slug: null }],
	publishedAt,
	image: null
});

const ready = (
	articles: ArticlePublicView[],
	extra: { total?: number | null; nextCursor?: string | null } = {}
): ArticlesFirstPageLoad => ({
	state: 'ready',
	page: {
		articles,
		nextCursor: extra.nextCursor ?? null,
		total: extra.total ?? null,
		appliedService: null
	}
});

const scope = (overrides: Partial<ArticlesListScope> = {}): ArticlesListScope => ({
	lang: 'el',
	type: null,
	q: null,
	serviceId: null,
	...overrides
});

const listHref: ArticlesListHref = ({ type, q, service }) => {
	const params = new URLSearchParams();
	if (type) params.set('type', type);
	if (q) params.set('q', q);
	if (service) params.set('service', service);
	const search = params.toString();
	return `/articles${search ? `?${search}` : ''}` as ResolvedPathname;
};

const props = (overrides: Partial<ArticlesListProps> = {}): ArticlesListProps => ({
	firstPage: ready([]),
	scope: scope(),
	locale: 'el',
	listHref,
	articleHref: (slug) => `/articles/${slug}` as ResolvedPathname,
	backHref: '/',
	canonicalUrl: 'https://www.example.org/articles',
	alternateUrls: {
		el: 'https://www.example.org/articles',
		en: 'https://www.example.org/en/articles'
	},
	...overrides
});

const renderList = (overrides: Partial<ArticlesListProps> = {}) =>
	render(QueryHarness, { props: { component: ArticlesList, props: props(overrides) } });

beforeEach(() => {
	// The page is whole from the server's first page; a read the harness's stale query starts never answers.
	vi.stubGlobal(
		'fetch',
		vi.fn(() => new Promise(() => {}))
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	document.head.innerHTML = '';
});

describe('articles::ui::list', () => {
	it('U-57.2 (the prototype 06 v3): ONE h1, the kinds as links, the newest article featured, the rest in the grid', () => {
		renderList({
			firstPage: ready([
				article(1, '2026-09-01T08:00:00.000Z'),
				article(2, '2026-10-20T08:00:00.000Z'),
				article(3, '2026-08-01T08:00:00.000Z')
			])
		});
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		const kinds = screen.getByRole('navigation', { name: 'Είδος' });
		expect(
			within(kinds)
				.getAllByTestId('articles-type-chip')
				.map((chip) => chip.getAttribute('href'))
		).toEqual(['/articles', '/articles?type=article', '/articles?type=advice']);
		const featured = screen.getByTestId('articles-featured');
		expect(featured).toHaveAttribute('href', '/articles/arthro-2');
		expect(
			screen
				.getAllByTestId('article-card')
				.map((card) => within(card).getByRole('link').getAttribute('href'))
		).toEqual(['/articles/arthro-1', '/articles/arthro-3']);
		expect(screen.queryByTestId('articles-count')).not.toBeInTheDocument();
	});

	it('U-63 (αντικαθιστά το «U-58.1 / U-59.5: below 744 the application’s list» του γύρου 1): below 744 the list is the prototype 06 v3’s — the newest featured full width with its dark pill, the cards without frame, shadow or «Διαβάστε»; the head stays the application’s', () => {
		const { container } = renderList({
			firstPage: ready([
				article(1, '2026-09-01T08:00:00.000Z'),
				article(2, '2026-10-20T08:00:00.000Z')
			])
		});
		const featured = screen.getByTestId('articles-featured');
		expect(featured).toHaveAttribute('href', '/articles/arthro-2');
		expect(featured.parentElement).not.toHaveClass('max-tablet:hidden');
		expect(featured).toHaveTextContent('Διαβάστε το άρθρο');
		expect(container.querySelector('[data-slot="articles-first-card"]')).toBeNull();
		const cards = screen.getAllByTestId('article-card');
		expect(cards).toHaveLength(1);
		const [card] = cards;
		expect(card.className).not.toMatch(/shadow|bg-card|p-3|rounded-xl/u);
		expect(card.querySelector('[data-slot="article-card-read"]')).toBeNull();
		expect(card.querySelector('[data-slot="article-card-list-meta"]')).toBeNull();
		expect(card.querySelector('[data-slot="article-card-meta"]')?.className).not.toMatch(/hidden/u);
		expect(within(card).getByTestId('article-card-type')).toBeInTheDocument();
		expect(within(card).getAllByRole('link')).toHaveLength(1);
		// U-63.3 (negative): the head below 744 is unchanged — the name in the bar, the outline chips.
		const bar = container.querySelector('[data-slot="page-bar"]') as HTMLElement;
		expect(bar.querySelector('[data-slot="page-bar-title"]')).toHaveAttribute('data-shown', 'true');
		// U-63 (the owner’s addition): on white as the prototype — no grey ground under the bar either.
		expect(bar).toHaveClass('bg-card');
		expect(bar).not.toHaveClass('bg-background');
		expect(screen.getByRole('heading', { level: 1 })).toHaveClass('max-tablet:sr-only');
		const [all] = screen.getAllByTestId('articles-type-chip');
		expect(all.querySelector('[data-slot="chip-pill"]')).toHaveClass(
			'max-tablet:ring-foreground',
			'tablet:bg-primary/10'
		);
	});

	it('MINOR-2 of r1: a card’s photo is the kit’s `RevealingPhoto` (U-14.6(α): painted from the server’s page) — never the card’s `opacity-0` until hydration', () => {
		const withPhoto = {
			...article(1, '2026-09-01T08:00:00.000Z'),
			image: { mediumSizeUrl: 'https://cdn.example.org/a.jpg' }
		};
		const { container } = renderList({
			firstPage: ready([article(2, '2026-10-20T08:00:00.000Z'), withPhoto])
		});
		const [card] = screen.getAllByTestId('article-card');
		expect(card.querySelector('[data-slot="revealing-photo"]')).toBeInTheDocument();
		expect(card.querySelector('[data-slot="media-card-image"]')).toBeNull();
		expect(container.querySelector('[data-testid="article-card-photo-media"]')).toHaveAttribute(
			'src',
			'https://cdn.example.org/a.jpg'
		);
	});

	it('U-57.5 Ε5 / D-103 (app = web, negative, MINOR-r2-1): a page with `?q=` asks no suggestions for the same words', async () => {
		vi.useFakeTimers();
		try {
			renderList({
				scope: scope({ q: 'καρδ' }),
				firstPage: ready([article(1, '2026-09-01T08:00:00.000Z')], { total: 1 })
			});
			await vi.advanceTimersByTimeAsync(300);
			const asked = vi
				.mocked(fetch)
				.mock.calls.filter(([input]) => String(input).includes('/suggestions'));
			expect(asked).toHaveLength(0);
			expect(screen.getByRole('combobox')).toHaveValue('καρδ');
		} finally {
			vi.useRealTimers();
		}
	});

	it('NIT-r2-1 (app = web, the application’s `isVisible`): while the field is typed in, the former words’ suggestions are not shown', async () => {
		const answer = (q: string) =>
			new Response(
				JSON.stringify({
					status: 'success',
					message: 'ok',
					data: { services: [], articles: [{ slug: `a-${q.length}`, title: `Άρθρο για ${q}` }] }
				}),
				{ status: 200 }
			);
		vi.mocked(fetch).mockImplementation(async (input) => {
			const url = new URL(String(input));
			return url.pathname.endsWith('/suggestions')
				? answer(url.searchParams.get('q') ?? '')
				: new Promise<Response>(() => {});
		});
		vi.useFakeTimers();
		try {
			renderList({ firstPage: ready([article(1, '2026-09-01T08:00:00.000Z')]) });
			const field = screen.getByRole('combobox');
			await fireEvent.input(field, { target: { value: 'καρδ' } });
			await vi.advanceTimersByTimeAsync(300);
			expect(screen.getByRole('option', { name: /Άρθρο για καρδ/u })).toBeInTheDocument();
			await fireEvent.input(field, { target: { value: 'καρδι' } });
			await vi.advanceTimersByTimeAsync(100);
			expect(screen.queryByRole('option', { name: /Άρθρο για καρδ$/u })).not.toBeInTheDocument();
			await vi.advanceTimersByTimeAsync(200);
			expect(screen.getByRole('option', { name: /Άρθρο για καρδι/u })).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	it('U-57.5 Ε5 / MAJOR-3 of r1 (app = web): the suggestions are asked after 250 ms of quiet — one read for the words, never one per key', async () => {
		vi.useFakeTimers();
		try {
			renderList({ firstPage: ready([article(1, '2026-09-01T08:00:00.000Z')]) });
			const asked = () =>
				vi.mocked(fetch).mock.calls.filter(([input]) => String(input).includes('/suggestions'));
			const field = screen.getByRole('combobox');
			for (const value of ['κα', 'καρ', 'καρδ']) {
				await fireEvent.input(field, { target: { value } });
				await vi.advanceTimersByTimeAsync(100);
			}
			expect(asked()).toHaveLength(0);
			await vi.advanceTimersByTimeAsync(200);
			expect(asked()).toHaveLength(1);
			expect(new URL(String(asked()[0][0])).searchParams.get('q')).toBe('καρδ');
		} finally {
			vi.useRealTimers();
		}
	});

	it('U-57.2: a full page offers «Εμφάνιση περισσότερων»; the last page does not', () => {
		const { unmount } = renderList({
			firstPage: ready([article(1, '2026-09-01T08:00:00.000Z')], { nextCursor: 'arthro-1' })
		});
		expect(screen.getByTestId('articles-more')).toHaveTextContent('Εμφάνιση περισσότερων');
		unmount();
		renderList({ firstPage: ready([article(1, '2026-09-01T08:00:00.000Z')]) });
		expect(screen.queryByTestId('articles-more')).not.toBeInTheDocument();
	});

	it('U-57.3: a search says how many it found for which words, and features none', () => {
		renderList({
			scope: scope({ q: 'πίεση' }),
			firstPage: ready([article(1, '2026-09-01T08:00:00.000Z')], { total: 1 })
		});
		expect(screen.getByTestId('articles-count')).toHaveTextContent('1 αποτέλεσμα για «πίεση»');
		expect(screen.queryByTestId('articles-featured')).not.toBeInTheDocument();
		expect(screen.getByRole('combobox')).toHaveValue('πίεση');
	});

	it('U-57.3 (negative): a search with no article is a sentence and «Καθαρισμός αναζήτησης» — never an empty grid', () => {
		renderList({ scope: scope({ q: 'ξψζ', type: 'ARTICLE' }), firstPage: ready([], { total: 0 }) });
		const empty = screen.getByTestId('articles-not-found');
		expect(within(empty).getByText('Δεν βρέθηκαν άρθρα για «ξψζ»')).toBeInTheDocument();
		expect(within(empty).getByRole('link', { name: 'Καθαρισμός αναζήτησης' })).toHaveAttribute(
			'href',
			'/articles?type=article'
		);
	});

	it('U-57.2 (negative): no article yet is its own words, not the search’s', () => {
		renderList();
		expect(screen.getByTestId('articles-empty')).toHaveTextContent(
			'Δεν υπάρχουν άρθρα προς το παρόν.'
		);
		expect(screen.queryByTestId('articles-not-found')).not.toBeInTheDocument();
	});

	it('U-61.2: a first page the server could not read is «Δοκιμάστε ξανά»', () => {
		renderList({ firstPage: { state: 'failed' } });
		expect(screen.getByTestId('articles-retry')).toHaveTextContent('Δοκιμάστε ξανά');
		expect(screen.queryByTestId('article-card')).not.toBeInTheDocument();
	});
});

import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import type { HomeArticlesResult } from '$modules/articles/lib/article-card';
import ArticlesRow from './index.svelte';

const result = (count: number): HomeArticlesResult => ({
	status: 'ok',
	articles: Array.from({ length: count }, (_, index) => ({
		id: `a${index}`,
		slug: `arthro-${index}`,
		title: `Άρθρο ${index}`,
		meta: 'Δρ. Μαρία · 5΄ ανάγνωση',
		imageUrl: null
	}))
});

describe('ArticlesRow (the home’s last row)', () => {
	it('U-20: «Άρθρα & συμβουλές υγείας» with its «→»; each article ONE link, the 4:3 photo, «author · reading time»', async () => {
		render(ArticlesRow, { props: { articles: Promise.resolve(result(2)) } });
		const row = await screen.findByTestId('home-articles');
		const title = within(row).getByRole('heading', { level: 2, name: 'Άρθρα & συμβουλές υγείας' });
		const arrow = within(title.closest('[data-slot="section-title-row"]') as HTMLElement).getByRole(
			'link',
			{ name: 'Δείτε όλα τα άρθρα' }
		);
		expect(arrow).toHaveAttribute('href', '/articles');
		const [card] = within(row).getAllByTestId('home-article-card');
		const links = within(card).getAllByRole('link');
		expect(links).toHaveLength(1);
		expect(links[0]).toHaveAttribute('href', '/articles/arthro-0');
		expect(links[0]).toHaveAccessibleName('Άρθρο 0');
		expect(within(card).queryByText(/Διαβάστε/u)).not.toBeInTheDocument();
		expect(within(card).getByText('Δρ. Μαρία · 5΄ ανάγνωση')).toHaveClass('line-clamp-2');
		expect(within(card).getByText('Άρθρο 0')).toHaveClass('line-clamp-2');
	});

	// Live r1 (6): the r0 card without a photo drew the doctor's silhouette (a face) for an article.
	it('U-20 (app = web): an article without a photo is the muted frame with a page glyph, never a doctor’s silhouette', async () => {
		render(ArticlesRow, { props: { articles: Promise.resolve(result(1)) } });
		const card = await screen.findByTestId('home-article-card');
		const frame = card.querySelector('[data-slot="media-card-placeholder"]') as HTMLElement;
		expect(frame).toHaveClass('bg-muted', 'aspect-4/3', 'rounded-lg');
		expect(frame.querySelector('[data-icon="document-text-outline"]')).toHaveClass(
			'icon-xl',
			'text-muted-foreground'
		);
		expect(card.querySelector('[data-slot="media-placeholder"]')).toBeNull();
	});

	it('U-20 (negative): a failed or empty feed shows no row — never a skeleton or an error of its own', async () => {
		for (const articles of [
			Promise.resolve<HomeArticlesResult>({ status: 'error' }),
			Promise.resolve(result(0))
		]) {
			const view = render(ArticlesRow, { props: { articles } });
			await articles;
			await waitFor(() => expect(screen.queryByTestId('home-articles')).not.toBeInTheDocument());
			expect(view.container.querySelector('[data-slot="skeleton"]')).toBeNull();
			view.unmount();
		}
	});
});

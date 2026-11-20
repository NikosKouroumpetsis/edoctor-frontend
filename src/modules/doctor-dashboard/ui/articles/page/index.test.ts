import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import {
	sampleArticleId,
	sampleArticleRow,
	sampleArticleRows,
	sampleArticlesServer
} from '$modules/doctor-dashboard/api/articles/articles.sample';
import Harness from './articles.harness.svelte';

/*
 * Wave 5.2 · screen 85 «Τα άρθρα μου» (U-221, D-W52-102): the list with the server stubbed at `fetch` (the module's
 * precedent) — the prototype's five articles, every state, made-up words.
 */

const links = {
	menu: '/doctor/menu',
	newArticle: '/doctor/articles/new',
	article: (id: string) => `/doctor/articles/${id}`
};

function serve(start: Parameters<typeof sampleArticlesServer>[0] = {}) {
	const server = sampleArticlesServer(start);
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(options: { locale?: 'el' | 'en'; session?: Session } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	return { client, ...render(Harness, { props: { client, links, ...options } }) };
}

const main = () => screen.getByTestId('doctor-articles');
const words = (element: Element) => element.textContent?.replace(/\s+/gu, ' ').trim();
const shown = (state: string) => waitFor(() => expect(main()).toHaveAttribute('data-view', state));

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('screen 85 «Τα άρθρα μου» (wave 5.2 · D-W52-102)', () => {
	it('🔴 U-221.1 · D-W52-102: one column in the middle — the title, its line, «+ Νέο άρθρο», the articles newest first; «‹» to «Μενού» only below 950', async () => {
		serve();
		open();
		await shown('ready');
		expect(main()).toHaveClass('mx-auto', 'max-w-document-wide');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Τα άρθρα μου');
		expect(main()).toHaveTextContent(
			'Άρθρα και συμβουλές υγείας για τη σελίδα σας. Δημοσιεύονται αφού τα ελέγξει η ομάδα του eDoctor.'
		);
		expect(screen.getByTestId('doctor-articles-new')).toHaveAttribute(
			'href',
			'/doctor/articles/new'
		);
		expect(screen.getByTestId('doctor-articles-new')).toHaveTextContent('Νέο άρθρο');
		const back = screen.getByTestId('doctor-articles-back');
		expect(back).toHaveAttribute('href', '/doctor/menu');
		expect(back).toHaveClass('split:hidden');
		const rows = within(screen.getByTestId('doctor-articles-list')).getAllByRole('link');
		expect(rows.map((row) => row.getAttribute('href'))).toEqual(
			[2, 3, 5, 4, 1].map((index) => `/doctor/articles/${sampleArticleId(index)}`)
		);
	});

	it('🔴 D-W52-102 (U-221.1): the four states and «Η αλλαγή σας ελέγχεται» — each row its pill, its title, «είδος · what the state says»', async () => {
		serve();
		open();
		await shown('ready');
		const row = (index: number) => screen.getByTestId(`doctor-article-${sampleArticleId(index)}`);
		const pill = (index: number) =>
			screen.getByTestId(`doctor-article-${sampleArticleId(index)}-state`);
		const meta = (index: number) =>
			words(screen.getByTestId(`doctor-article-${sampleArticleId(index)}-meta`));
		expect(words(pill(2))).toBe('Δημοσιευμένο');
		expect(pill(2)).toHaveAttribute('data-tone', 'success');
		expect(meta(2)).toBe('Συμβουλή υγείας · Η αλλαγή σας ελέγχεται');
		expect(words(pill(3))).toBe('Σε έλεγχο');
		expect(pill(3)).toHaveAttribute('data-tone', 'warning');
		expect(meta(3)).toBe('Άρθρο · Στάλθηκε 12 Νοεμβρίου 2026');
		expect(words(pill(5))).toBe('Πρόχειρο');
		expect(meta(5)).toBe('Άρθρο · Τελευταία αλλαγή 10 Νοεμβρίου 2026');
		expect(words(pill(4))).toBe('Δεν δημοσιεύτηκε');
		expect(pill(4)).toHaveAttribute('data-tone', 'refused');
		expect(meta(4)).toBe('Άρθρο · Διορθώστε το και στείλτε το ξανά');
		expect(meta(1)).toBe('Άρθρο · Από 3 Νοεμβρίου 2026');
		expect(row(1)).toHaveTextContent('Υπέρταση: πότε να ανησυχήσετε');
		// A cover is a picture of the row; none ⇒ the pen.
		expect(row(1).querySelector('img')).toHaveAttribute(
			'src',
			'https://cdn.seed.edoctor.test/articles/a1.webp'
		);
		expect(row(5).querySelector('img')).toBeNull();
		// Live check 85 (19/11), `sw.css:617-618`: a cover sits on `muted`; the pen alone on `chip`; a cover that does not
		// load leaves the prototype's picture on `muted`, never a broken image.
		const thumb = (n: number) =>
			row(n).querySelector('[data-slot="doctor-article-thumb"]') as HTMLElement;
		expect(thumb(1)).toHaveClass('bg-muted');
		expect(thumb(5)).toHaveClass('bg-chip');
		expect(thumb(5)).not.toHaveClass('bg-muted');
		thumb(1).querySelector('img')?.dispatchEvent(new Event('error'));
		await waitFor(() => expect(thumb(1).querySelector('img')).toBeNull());
		expect(thumb(1)).toHaveClass('bg-muted');
		expect(thumb(1).querySelector('svg')).not.toBeNull();
	});

	it('D-W52-102: none written ⇒ «Δεν έχετε γράψει ακόμη άρθρα», its words and «+ Νέο άρθρο»', async () => {
		serve({ rows: [] });
		open();
		await shown('empty');
		expect(screen.getByTestId('doctor-articles-empty')).toHaveTextContent(
			'Δεν έχετε γράψει ακόμη άρθρα'
		);
		expect(screen.getByTestId('doctor-articles-empty')).toHaveTextContent(
			'Ένα άρθρο εξηγεί με απλά λόγια ένα θέμα της ειδικότητάς σας.'
		);
		expect(screen.getByTestId('doctor-articles-new')).toHaveAttribute(
			'href',
			'/doctor/articles/new'
		);
		expect(screen.queryByTestId('doctor-articles-list')).toBeNull();
	});

	it('D-W52-96: «Εμφάνιση παλαιότερων» reads the next page by the server’s cursor', async () => {
		const server = serve({
			rows: Array.from({ length: 25 }, (_, index) => sampleArticleRow(index + 1)),
			pageSize: 20
		});
		open();
		await shown('ready');
		expect(within(screen.getByTestId('doctor-articles-list')).getAllByRole('link')).toHaveLength(
			20
		);
		await userEvent.setup().click(screen.getByTestId('doctor-articles-more'));
		await waitFor(() =>
			expect(within(screen.getByTestId('doctor-articles-list')).getAllByRole('link')).toHaveLength(
				25
			)
		);
		expect(server.calls.map((call) => call.query.cursor ?? null)).toEqual([null, '20']);
		expect(screen.queryByTestId('doctor-articles-more')).toBeNull();
	});

	it('a failed read says so with «Δοκιμάστε ξανά», which reads again; a `401` ends the session once', async () => {
		const server = serve();
		server.refuse('GET', '/article/me/articles', 500);
		server.refuse('GET', '/article/me/articles', 500);
		open();
		await shown('failed');
		await userEvent.setup().click(screen.getByTestId('doctor-articles-retry'));
		await shown('ready');
		vi.unstubAllGlobals();
		const again = serve();
		again.refuse('GET', '/article/me/articles', 401);
		const expire = vi.fn();
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Ελένη' }),
			signOut: async () => undefined,
			expire
		});
		open({ session });
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
	});

	it('🔴 U-65.6 (negative): a title with markup stays its words — never an element; English words in `/en`', async () => {
		serve({
			rows: [
				sampleArticleRow(1, { title: '<img src=x onerror=alert(1)>' }),
				...sampleArticleRows().slice(0, 1)
			]
		});
		const { container } = open({ locale: 'en' });
		await shown('ready');
		expect(container.querySelector('img[onerror]')).toBeNull();
		expect(screen.getByTestId(`doctor-article-${sampleArticleId(1)}`)).toHaveTextContent(
			'<img src=x onerror=alert(1)>'
		);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My articles');
		expect(words(screen.getByTestId(`doctor-article-${sampleArticleId(2)}-meta`))).toBe(
			'Health advice · Your change is being checked'
		);
	});
});

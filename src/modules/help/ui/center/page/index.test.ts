import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import type { ResolvedPathname } from '$app/types';
import type { RichTextDoc } from '$shared/lib/rich-text';
import type { HelpCenterProps, HelpHref } from '../types';
import HelpCenter from './index.svelte';

const h2 = (text: string, attrs: Record<string, unknown> = {}) => ({
	type: 'heading',
	attrs: { level: 2, ...attrs },
	text
});
const h3 = (text: string, attrs: Record<string, unknown> = {}) => ({
	type: 'heading',
	attrs: { level: 3, ...attrs },
	text
});
const p = (text: string) => ({ type: 'paragraph', text });

const body: RichTextDoc = {
	type: 'doc',
	content: [
		h2('Διαδικασία ραντεβού', { anchor: 'booking', label: 'Ραντεβού' }),
		h3('Τι χρειάζεται για να κλείσω ραντεβού;', { anchor: 'what-you-need', popular: true }),
		p('Θα χρειαστεί ένα κινητό τηλέφωνο.'),
		h3('Πώς μπορώ να ακυρώσω το ραντεβού μου;', { anchor: 'cancellation' }),
		p('Η ακύρωση γίνεται από «Τα ραντεβού μου».'),
		h2('edoctor chat', { anchor: 'chat' }),
		h3('Ποιοι γιατροί είναι διαθέσιμοι;'),
		h2('Προσωπικός λογαριασμός', { anchor: 'account' }),
		h3('Πώς διαγράφω τον λογαριασμό;', { anchor: 'delete-account' }),
		p('Προφίλ › Ρυθμίσεις λογαριασμού › Διαγραφή λογαριασμού.')
	]
};

const helpHref: HelpHref = ({ q, topic, hash }) => {
	const params = new URLSearchParams();
	if (q) params.set('q', q);
	if (topic) params.set('topic', topic);
	const search = params.toString();
	return `/help${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}` as ResolvedPathname;
};

const props = (overrides: Partial<HelpCenterProps> = {}): HelpCenterProps => ({
	faq: { state: 'ready', body, language: 'el' },
	locale: 'el',
	helpHref,
	backHref: '/',
	internalHref: (path) => path,
	supportEmail: 'support@example.org',
	onRetry: vi.fn(),
	canonicalUrl: 'https://www.example.org/help',
	alternateUrls: { el: 'https://www.example.org/help', en: 'https://www.example.org/en/help' },
	...overrides
});

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

afterEach(() => {
	visit('/');
	document.head.innerHTML = '';
});

describe('help::ui::center', () => {
	it('U-60.1 (the prototype 08 Π1–Π4): ONE page — the H1, the topics as links, «Δημοφιλείς ερωτήσεις», a topic per H2', () => {
		visit('/help');
		render(HelpCenter, { props: props() });
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(
			screen.getByRole('heading', { level: 1, name: 'Πώς μπορούμε να βοηθήσουμε;' })
		).toBeInTheDocument();
		const chips = screen.getByRole('navigation', { name: 'Θέματα' });
		expect(within(chips).getByRole('link', { name: 'Όλα' })).toHaveAttribute('href', '/help');
		expect(within(chips).getByRole('link', { name: 'Ραντεβού' })).toHaveAttribute(
			'href',
			'/help?topic=booking'
		);
		const popular = screen.getByTestId('help-popular');
		expect(
			within(popular)
				.getAllByRole('link')
				.map((link) => link.getAttribute('href'))
		).toEqual(['#what-you-need']);
		expect(screen.getAllByTestId('help-topic').map((topic) => topic.getAttribute('id'))).toEqual([
			'booking',
			'account'
		]);
		expect(document.getElementById('cancellation')?.tagName).toBe('DETAILS');
	});

	it('U-60.1 (negative): a topic whose questions have no answer is not shown, and no question without its answer', () => {
		visit('/help');
		render(HelpCenter, { props: props() });
		expect(screen.queryByRole('heading', { name: 'edoctor chat' })).not.toBeInTheDocument();
		expect(screen.queryByText('Ποιοι γιατροί είναι διαθέσιμοι;')).not.toBeInTheDocument();
		expect(document.head.innerHTML).toContain('"FAQPage"');
		expect(document.head.innerHTML).not.toContain('Ποιοι γιατροί');
	});

	it('U-60.1 Π6 / U-58.1: «Δεν βρήκατε απάντηση;» writes to the support address — below 744 the application’s row, from 744 the pill', () => {
		visit('/help');
		render(HelpCenter, { props: props() });
		const pill = screen.getByTestId('help-contact-email');
		const row = screen.getByTestId('help-contact-row');
		expect(pill).toHaveAttribute('href', 'mailto:support@example.org');
		expect(row).toHaveAttribute('href', 'mailto:support@example.org');
		expect(pill).toHaveClass('max-tablet:hidden');
		expect(row).toHaveClass('tablet:hidden', 'min-h-touch', 'text-title-xs');
		expect(row.querySelector('[data-icon="chevron-forward"]')).toBeInTheDocument();
	});

	it('U-58.1 (app = web): the topics are outline chips below 744 (the tint from 744), the chosen one brought into view', () => {
		visit('/help?topic=account');
		render(HelpCenter, { props: props() });
		const chosen = screen.getByRole('link', { name: 'Προσωπικός λογαριασμός' });
		expect(chosen).toHaveAttribute('aria-current', 'page');
		expect(chosen.querySelector('[data-slot="chip-pill"]')).toHaveClass(
			'max-tablet:ring-foreground',
			'tablet:bg-primary/10'
		);
	});

	it('U-60.1 Π5: `#cancellation` in the address opens that question where it is and brings it to the top; `#booking` its topic', async () => {
		const scrollIntoView = vi.fn();
		Object.defineProperty(Element.prototype, 'scrollIntoView', {
			value: scrollIntoView,
			configurable: true
		});
		visit('/help#cancellation');
		const { unmount } = render(HelpCenter, { props: props() });
		await vi.waitFor(() =>
			expect((document.getElementById('cancellation') as HTMLDetailsElement).open).toBe(true)
		);
		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
		expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById('cancellation'));
		unmount();
		visit('/help#booking');
		render(HelpCenter, { props: props() });
		await vi.waitFor(() =>
			expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById('booking'))
		);
		delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
	});

	it('MINOR-4 of r1 (negative): a broken escape in the address (`#%`) is no anchor — the page comes alive, nothing thrown', () => {
		visit('/help#%E0%A4');
		expect(() => render(HelpCenter, { props: props() })).not.toThrow();
		expect(screen.getAllByTestId('help-topic')).toHaveLength(2);
	});

	it('U-58.1 / U-60.1 Π4 (app = web): below 744 the field filters as it is typed — the words go into the address after 250 ms, no suggestions panel', async () => {
		vi.useFakeTimers();
		const listeners: (() => void)[] = [];
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({
				matches: false,
				addEventListener: (_: string, listener: () => void) => listeners.push(listener),
				removeEventListener: vi.fn()
			}))
		);
		try {
			visit('/help?topic=booking');
			render(HelpCenter, { props: props() });
			const field = screen.getByRole('combobox');
			await fireEvent.input(field, { target: { value: 'ακυρ' } });
			expect(field).toHaveAttribute('aria-expanded', 'false');
			await vi.advanceTimersByTimeAsync(200);
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
			await vi.advanceTimersByTimeAsync(60);
			expect(vi.mocked(goto)).toHaveBeenCalledWith(
				'/help?q=%CE%B1%CE%BA%CF%85%CF%81&topic=booking',
				{
					keepFocus: true,
					noScroll: true,
					replaceState: true
				}
			);
		} finally {
			vi.unstubAllGlobals();
			vi.useRealTimers();
		}
	});

	it('U-60.1 (negative): from 744 typing never moves the address — its suggestions do the work', async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
		);
		try {
			visit('/help');
			render(HelpCenter, { props: props() });
			const field = screen.getByRole('combobox');
			await fireEvent.input(field, { target: { value: 'ακυρ' } });
			await vi.advanceTimersByTimeAsync(400);
			expect(vi.mocked(goto)).not.toHaveBeenCalled();
			expect(field).toHaveAttribute('aria-expanded', 'true');
		} finally {
			vi.unstubAllGlobals();
			vi.useRealTimers();
		}
	});

	it('U-60.1 (negative, MAJOR-1 of r1): the seed’s page without H2/H3 is its TEXT — no field, no chips, no popular, the contact stays', () => {
		visit('/help');
		const plain: RichTextDoc = {
			type: 'doc',
			content: [p('Πώς κλείνω ραντεβού;'), p('Από την αναζήτηση γιατρών.')]
		};
		render(HelpCenter, { props: props({ faq: { state: 'ready', body: plain, language: 'el' } }) });
		expect(screen.getByTestId('help-text')).toHaveTextContent('Από την αναζήτηση γιατρών.');
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
		expect(screen.queryByRole('navigation', { name: 'Θέματα' })).not.toBeInTheDocument();
		expect(screen.queryByTestId('help-popular')).not.toBeInTheDocument();
		expect(screen.getByTestId('help-contact')).toBeInTheDocument();
		expect(document.head.innerHTML).not.toContain('FAQPage');
	});

	it('U-60.1 (negative, MAJOR-1 of r1): an empty page (or a CMS without it) says so — never an empty column', () => {
		visit('/help');
		render(HelpCenter, { props: props({ faq: { state: 'ready', body: null, language: null } }) });
		expect(screen.getByTestId('help-none')).toHaveTextContent(
			'Δεν υπάρχουν ερωτήσεις προς το παρόν.'
		);
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
		expect(screen.getByTestId('help-contact')).toBeInTheDocument();
	});

	it('U-60.1 Π3: a search in the address shows its count and opens its first answer; the popular ones step aside', () => {
		visit('/help?q=ακυρωση');
		render(HelpCenter, { props: props() });
		expect(screen.getByRole('status')).toHaveTextContent('1 αποτέλεσμα για «ακυρωση»');
		const [first] = within(screen.getByTestId('help-results')).getAllByRole('group');
		expect(first).toHaveAttribute('open');
		expect(screen.queryByTestId('help-popular')).not.toBeInTheDocument();
	});

	it('U-60.1 Π4: the words of the search are bold where they are — in the question and in its answer, accents folded', () => {
		visit('/help?q=ακυρωσω%20ραντεβου');
		render(HelpCenter, { props: props() });
		const [first] = within(screen.getByTestId('help-results')).getAllByRole('group');
		const summary = first.querySelector('[data-slot="accordion-summary"]') as HTMLElement;
		expect([...summary.querySelectorAll('mark')].map((mark) => mark.textContent)).toEqual([
			'ακυρώσω',
			'ραντεβού'
		]);
		expect(
			[...first.querySelectorAll('[data-slot="rich-text"] mark')].map((mark) => mark.textContent)
		).toEqual(['ραντεβού']);
	});

	it('U-60.1 Π4 (negative): without a search nothing is marked', () => {
		visit('/help');
		render(HelpCenter, { props: props() });
		expect(document.querySelector('[data-testid="help-center"] mark')).toBeNull();
	});

	it('U-60.1 Π3 (negative): no hit is a sentence and a way out, never an empty column', () => {
		visit('/help?q=ξψζ');
		render(HelpCenter, { props: props() });
		const empty = screen.getByTestId('help-empty');
		expect(within(empty).getByText('Δεν βρέθηκαν ερωτήσεις για «ξψζ»')).toBeInTheDocument();
		expect(within(empty).getByRole('link')).toHaveAttribute('href', '/help');
	});

	it('U-60.1 Π2: a topic in the address shows that topic alone', () => {
		visit('/help?topic=account');
		render(HelpCenter, { props: props() });
		expect(screen.getAllByTestId('help-topic').map((topic) => topic.id)).toEqual(['account']);
		expect(screen.queryByTestId('help-popular')).not.toBeInTheDocument();
	});

	it('U-61.2 (negative): a failed read is «Δοκιμάστε ξανά» — no search, no topics, no JSON-LD', async () => {
		visit('/help');
		const onRetry = vi.fn();
		render(HelpCenter, { props: props({ faq: { state: 'failed' }, onRetry }) });
		const retry = screen.getByTestId('help-retry');
		expect(retry).toHaveTextContent('Δοκιμάστε ξανά');
		retry.click();
		expect(onRetry).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
		expect(screen.queryByRole('navigation', { name: 'Θέματα' })).not.toBeInTheDocument();
		expect(document.head.innerHTML).not.toContain('FAQPage');
	});

	it('U-78 (`23-helpful` Π1): each answer ends with its own «Ήταν χρήσιμο;», by the question’s anchor', () => {
		const helpful = createRawSnippet((anchor: () => string) => ({
			render: () => `<div data-testid="widget" data-anchor="${anchor()}"></div>`
		}));
		render(HelpCenter, { props: props({ helpful }) });
		const widgets = screen.getAllByTestId('widget');
		expect(widgets.length).toBeGreaterThan(0);
		for (const widget of widgets) {
			const question = widget.closest('details');
			expect(question).not.toBeNull();
			expect(widget.getAttribute('data-anchor')).toBe(question?.id);
		}
	});
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import Harness from './document-page.harness.svelte';
import { DOCUMENT_PAGE_TOC_MIN, DOCUMENT_PAGE_TOP_AFTER_SCREENS, readingHeading } from './index';

const two = [
	{ id: 'o-logariasmos', label: 'Ο λογαριασμός σας' },
	{ id: 'rantevou', label: 'Ραντεβού και ακυρώσεις' }
];

describe('DocumentPage', () => {
	afterEach(() => vi.restoreAllMocks());

	it('common v2 §A (app = web): «Σε αυτό το …» only with two headings or more — the box, the aside and the phone’s row', () => {
		expect(DOCUMENT_PAGE_TOC_MIN).toBe(2);
		render(Harness, { props: { toc: two } });
		const page = screen.getByTestId('document');
		expect(page.querySelector('[data-slot="document-page-toc-box"]')).not.toBeNull();
		expect(page.querySelector('[data-slot="document-page-toc"]')).not.toBeNull();
		expect(page.querySelector('[data-slot="document-page-toc-row"]')).not.toBeNull();
		const box = page.querySelector('[data-slot="document-page-toc-box"]') as HTMLElement;
		expect(
			within(box)
				.getAllByRole('link')
				.map((link) => link.getAttribute('href'))
		).toEqual(['#o-logariasmos', '#rantevou']);
	});

	it('common v2 §A (negative): one heading draws no «Σε αυτό το …» anywhere', () => {
		render(Harness, { props: { toc: two.slice(0, 1) } });
		const page = screen.getByTestId('document');
		for (const slot of ['document-page-toc-box', 'document-page-toc', 'document-page-toc-row'])
			expect(page.querySelector(`[data-slot="${slot}"]`), slot).toBeNull();
	});

	it('U-59.1 Π1: the breadcrumbs link every step with an address, the page itself muted and current; ONE h1', () => {
		render(Harness, { props: { toc: two } });
		const crumbs = screen.getByRole('navigation', { name: 'Διαδρομή' });
		expect(within(crumbs).getByRole('link', { name: 'Νομικά' })).toHaveAttribute('href', '/legal');
		expect(within(crumbs).getByText('Όροι χρήσης')).toHaveAttribute('aria-current', 'page');
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
	});

	it('common v2 §A: a ToC entry glides to its heading and hands its anchor to the page (the address)', async () => {
		const onAnchor = vi.fn();
		const scroll = vi.fn();
		Element.prototype.scrollIntoView = scroll;
		render(Harness, { props: { toc: two, onAnchor } });
		const box = screen
			.getByTestId('document')
			.querySelector('[data-slot="document-page-toc-box"]') as HTMLElement;
		await fireEvent.click(within(box).getByRole('link', { name: 'Ραντεβού και ακυρώσεις' }));
		expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
		expect(onAnchor).toHaveBeenCalledWith('rantevou');
	});

	it('U-59.1 Π7: «↑ Επιστροφή στην κορυφή» only with its words, hidden (and out of the Tab order) until two screens down', () => {
		expect(DOCUMENT_PAGE_TOP_AFTER_SCREENS).toBe(2);
		render(Harness, { props: { toc: two, backToTopLabel: 'Επιστροφή στην κορυφή' } });
		const pill = screen.getByTestId('document').querySelector('[data-slot="document-page-to-top"]');
		expect(pill).toHaveTextContent('Επιστροφή στην κορυφή');
		expect(pill).toHaveAttribute('aria-hidden', 'true');
		expect(pill).toHaveAttribute('tabindex', '-1');
		expect(pill).toHaveClass('opacity-0', 'duration-standard');
	});

	it('U-58.3 (negative): the application’s text page below 744 has no ToC row, its cards and «↑» stay from 744', () => {
		render(Harness, {
			props: { toc: two, phone: 'app', withCards: true, backToTopLabel: 'Επιστροφή στην κορυφή' }
		});
		const page = screen.getByTestId('document');
		expect(page.querySelector('[data-slot="document-page-toc-row"]')).toBeNull();
		expect(page.querySelector('[data-slot="document-page-cards"]')).toHaveClass(
			'max-tablet:hidden'
		);
		expect(page.querySelector('[data-slot="document-page-to-top"]')).toHaveClass(
			'max-tablet:hidden'
		);
		expect(screen.getByRole('heading', { level: 1 })).toHaveClass('max-tablet:sr-only');
	});

	it('common v2 §A: the section being read is the last heading that reached the line its anchor would stop at', () => {
		expect(
			readingHeading([
				{ id: 'a', top: -400, line: 104 },
				{ id: 'b', top: 105, line: 104 },
				{ id: 'c', top: 600, line: 104 }
			])
		).toBe('b');
		expect(readingHeading([{ id: 'a', top: 300, line: 104 }])).toBeNull();
	});
});

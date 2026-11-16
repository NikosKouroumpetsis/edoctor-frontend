import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { visitInitials } from './visit-card.svelte';
import Harness from './visit-card.harness.svelte';

const request = {
	when: 'Σήμερα, 17:30',
	name: 'Νίκος Μαυρίδης',
	meta: 'Επίσκεψη · 30 λεπτά · Κηφισίας 120',
	byline: 'Το έκλεισε: Ελένη Μαυρίδη (γονέας)',
	quote: '«Βήχας εδώ και μία εβδομάδα, χωρίς πυρετό.»',
	deadline: 'Απαντήστε έως τις 16:30',
	testId: 'card'
};

describe('VisitCard (D-W51-27: screen 66’s card, shared)', () => {
	it('the prototype’s order: the initials, when, who, what and where, who arranged it, their words, the time to answer by', () => {
		render(Harness, { props: request });
		const card = screen.getByTestId('card');
		expect(card.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('ΝΜ');
		expect(
			[...card.querySelectorAll('p')].map((line) => line.textContent?.replace(/\s+/gu, ' ').trim())
		).toEqual([
			'Σήμερα, 17:30',
			'Νίκος Μαυρίδης',
			'Επίσκεψη · 30 λεπτά · Κηφισίας 120',
			'Το έκλεισε: Ελένη Μαυρίδη (γονέας)',
			'«Βήχας εδώ και μία εβδομάδα, χωρίς πυρετό.»',
			'Απαντήστε έως τις 16:30'
		]);
		expect(card.className).toContain('border-line-2');
		expect(card).not.toHaveAttribute('data-dim');
	});

	it('the answers come under the words, the card’s whole width, and answer the press', async () => {
		const confirm = vi.fn();
		render(Harness, { props: { ...request, withActions: true, onConfirm: confirm } });
		const card = screen.getByTestId('card');
		const stack = card.querySelector('[data-slot="button-stack"]');
		expect(stack?.parentElement).toBe(card);
		expect(card.lastElementChild).toBe(stack);
		await userEvent.setup().click(screen.getByRole('button', { name: 'Επιβεβαίωση' }));
		expect(confirm).toHaveBeenCalledTimes(1);
	});

	it('«σε 20 λεπτά» beside the time, a quiet footnote, the state as a pill; fainter when over', () => {
		render(Harness, {
			props: {
				when: '13:00',
				soon: 'σε 20 λεπτά',
				name: 'Αντώνης Πέτρου',
				footnote: 'Αν δεν απαντήσετε, αύριο στις 18:00 γράφεται «Ολοκληρώθηκε».',
				tag: { label: 'Ολοκληρώθηκε', tone: 'muted' },
				dim: true,
				testId: 'card'
			}
		});
		const card = screen.getByTestId('card');
		expect(card.querySelector('[data-slot="visit-card-soon"]')).toHaveTextContent('σε 20 λεπτά');
		expect(card.querySelector('[data-slot="visit-card-footnote"]')).toHaveTextContent(
			'γράφεται «Ολοκληρώθηκε»'
		);
		expect(card.querySelector('[data-slot="status-pill"]')).toHaveAttribute('data-tone', 'muted');
		expect(card).toHaveAttribute('data-dim', 'true');
		expect(card.className).toContain('opacity-70');
	});

	it('(negative) words with HTML stay words — a patient’s note never becomes markup (U-65.6)', () => {
		render(Harness, {
			props: { ...request, quote: '«<img src=x onerror=alert(1)>»', name: '<b>Χ</b> Ψ' }
		});
		const card = screen.getByTestId('card');
		expect(card.querySelector('img, b')).toBeNull();
		expect(card).toHaveTextContent('«<img src=x onerror=alert(1)>»');
	});

	it('the circle’s initials: two words at most, the first letter of each, capitals', () => {
		expect(visitInitials('Νίκος Μαυρίδης')).toBe('ΝΜ');
		expect(visitInitials('  ελένη  σταύρου  παππά ')).toBe('ΕΣ');
		expect(visitInitials('Σοφία')).toBe('Σ');
		expect(visitInitials('')).toBe('');
	});

	it('D-W51-36: with `href` the whole card opens it — its link stretches over the card — and the answers lie above that link', async () => {
		const confirm = vi.fn();
		render(Harness, {
			props: { ...request, href: '/x/1', withActions: true, onConfirm: confirm }
		});
		const card = screen.getByTestId('card');
		const link = card.querySelector('[data-slot="visit-card-link"]') as HTMLAnchorElement;
		expect(link).toHaveAttribute('href', '/x/1');
		expect(link).toHaveTextContent('Νίκος Μαυρίδης');
		expect(link.className).toContain('after:absolute');
		expect(link.className).toContain('min-h-touch');
		expect(card.className).toContain('relative');
		const answers = card.querySelector('[data-slot="visit-card-actions"]') as HTMLElement;
		expect(answers.className).toContain('z-10');
		expect(link.contains(screen.getByRole('button', { name: 'Επιβεβαίωση' }))).toBe(false);
		await userEvent.setup().click(screen.getByRole('button', { name: 'Επιβεβαίωση' }));
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(link).not.toHaveAttribute('aria-current');
		expect(link).not.toHaveAttribute('data-sveltekit-noscroll');
	});

	it('D-W51-36: the chosen card is dark-bordered from the caller’s breakpoint (1128 or 950), its link the current page; opening in place keeps the scroll', () => {
		const view = render(Harness, {
			props: { ...request, href: '/x/1', selected: true, selectFrom: 'laptop', inPlace: true }
		});
		let card = screen.getByTestId('card');
		expect(card).toHaveAttribute('data-selected', 'true');
		expect(card).toHaveClass('laptop:border-foreground', 'laptop:ring-1', 'laptop:ring-inset');
		expect(card.className).not.toMatch(/(^|\s)split:/u);
		const link = card.querySelector('a') as HTMLAnchorElement;
		expect(link).toHaveAttribute('aria-current', 'page');
		expect(link).toHaveAttribute('data-sveltekit-noscroll', '');
		expect(link).toHaveAttribute('data-sveltekit-keepfocus', '');
		view.unmount();
		render(Harness, { props: { ...request, href: '/x/1', selected: true } });
		card = screen.getByTestId('card');
		expect(card).toHaveClass('split:border-foreground', 'split:ring-1');
	});

	it('(negative) without `href` the card is no link and never shows itself chosen', () => {
		render(Harness, { props: { ...request, selected: false } });
		const card = screen.getByTestId('card');
		expect(card.querySelector('a')).toBeNull();
		expect(card).not.toHaveAttribute('data-selected');
		expect(card.className).not.toMatch(/border-foreground/u);
	});
});

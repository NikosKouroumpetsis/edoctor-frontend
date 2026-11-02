import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { SearchResultCard } from '$modules/search-doctors/types';
import SearchDoctorCard from './index.svelte';

const card = (overrides: Partial<SearchResultCard> = {}): SearchResultCard => ({
	id: 'd1',
	doctorSlug: 'a-pappas',
	name: 'Ανδρέας Παππάς',
	specialty: 'Καρδιολόγος',
	area: 'Αμπελόκηποι',
	availabilityLabel: 'Σήμερα · 17:30',
	fee: { kind: 'amount', label: 'Από 60 €' },
	ratingLabel: '4,9',
	imageUrl: null,
	description: 'Εξειδίκευση στην προληπτική καρδιολογία και στο υπερηχογράφημα καρδιάς.',
	address: 'Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι',
	reviewCountLabel: '184',
	point: { latitude: 37.99, longitude: 23.76 },
	pinLabel: '60 €',
	...overrides
});

const base = {
	href: '/doctors/a-pappas',
	profileLabel: 'Προφίλ γιατρού',
	favoriteLabel: 'Αποθήκευσε γιατρό',
	onFavorite: () => {},
	onSignIn: () => {}
};

const slot = (name: string) => document.querySelector(`[data-slot="results-card-${name}"]`);

describe('search-doctors::ui::search-doctor-card', () => {
	it('U-24.1: the list variant is the SAME card — one link, the heart, the 4:3 photo, then the application’s facts in order', () => {
		render(SearchDoctorCard, {
			props: { ...base, doctor: card(), variant: 'list', testId: 'results-card' }
		});
		const root = screen.getByTestId('results-card');
		expect(root).toHaveAttribute('data-variant', 'list');
		expect(screen.getByRole('link', { name: 'Προφίλ γιατρού Ανδρέας Παππάς' })).toHaveAttribute(
			'href',
			'/doctors/a-pappas'
		);
		expect(screen.getByTestId('results-card-favorite')).toBeInTheDocument();
		expect(root.querySelector('[class*="aspect-4/3"]')).not.toBeNull();
		expect(slot('name')).toHaveTextContent('Ανδρέας Παππάς');
		expect(slot('description')).toHaveClass('line-clamp-2', 'text-muted-foreground');
		expect(slot('address')).toHaveTextContent('Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι');
		expect(slot('availability')).toHaveClass('text-primary-text', 'font-semibold');
		// The no-break spaces are kept (the matcher would fold them): the price and «★ 4,9» never part.
		expect(slot('price')?.textContent).toContain('Από 60 €');
		const rating = slot('rating') as HTMLElement;
		expect(rating.querySelector('[data-slot="results-card-star"]')).toHaveClass('text-rating');
		expect(rating.textContent).toContain('★ 4,9');
		expect(slot('reviews')).toHaveTextContent('184');
		const order = [...root.querySelectorAll('[data-slot^="results-card-"]')].map((node) =>
			node.getAttribute('data-slot')
		);
		expect(order).toEqual([
			'results-card-name',
			'results-card-description',
			'results-card-address',
			'results-card-availability',
			'results-card-price',
			'results-card-rating',
			'results-card-star',
			'results-card-reviews'
		]);
	});

	it('S-31.1 (U-24.1): no reviews ⇒ «★ Νέο», no review count, the word not blue', () => {
		render(SearchDoctorCard, {
			props: {
				...base,
				doctor: card({ ratingLabel: 'Νέο', reviewCountLabel: null }),
				variant: 'list',
				testId: 'results-card'
			}
		});
		expect(slot('rating')?.textContent).toContain('★ Νέο');
		expect(slot('reviews')).toBeNull();
	});

	it('U-24.1 (NIT-7 of r1): «★ 4,9» is one unbroken run of text — the no-break space alone between them, no flex gap around it', () => {
		render(SearchDoctorCard, {
			props: { ...base, doctor: card(), variant: 'list', testId: 'results-card' }
		});
		const score = slot('star')?.parentElement as HTMLElement;
		expect(score).toHaveClass('whitespace-nowrap');
		expect(score).not.toHaveClass('inline-flex');
		expect(score).not.toHaveClass('gap-1');
		expect(score.textContent).toBe(`★${String.fromCharCode(160)}4,9`);
	});

	it('U-24.4: the pointer on a list card tells the map, which grows its pin', async () => {
		const onHover = vi.fn();
		render(SearchDoctorCard, {
			props: { ...base, doctor: card(), variant: 'list', onHover, testId: 'results-card' }
		});
		const root = screen.getByTestId('results-card');
		await fireEvent.pointerEnter(root);
		await fireEvent.pointerLeave(root);
		expect(onHover.mock.calls).toEqual([[true], [false]]);
	});

	it('U-20 (negative): the home’s rail card stays as it was — the 1:1 photo, «Ειδικότητα · Περιοχή», no description or address', () => {
		render(SearchDoctorCard, { props: { ...base, doctor: card() } });
		const root = screen.getByTestId('home-doctor-card');
		expect(root).toHaveAttribute('data-variant', 'rail');
		expect(root.querySelector('[class*="aspect-square"]')).not.toBeNull();
		expect(root).toHaveTextContent('Καρδιολόγος · Αμπελόκηποι');
		expect(root).not.toHaveTextContent('Λεωφόρος Αλεξάνδρας');
		expect(document.querySelector('[data-slot="home-doctor-card-description"]')).toBeNull();
	});
});

describe('search-doctors::ui::search-doctor-card (f1)', () => {
	const signInCard = card({
		fee: { kind: 'login', label: 'Συνδεθείτε για κόστος' },
		pinLabel: null
	});

	it('U-27.3 (app = web): the specialty is in the text colour — the home’s «Ειδικότητα · Περιοχή» and the list’s «Ειδικότητα»', () => {
		const home = render(SearchDoctorCard, { props: { ...base, doctor: card() } });
		const facts = within(screen.getByTestId('home-doctor-card')).getByText(
			'Καρδιολόγος · Αμπελόκηποι'
		);
		expect(facts).toHaveClass('text-foreground');
		expect(facts).not.toHaveClass('text-muted-foreground');
		home.unmount();
		render(SearchDoctorCard, {
			props: { ...base, doctor: card(), variant: 'list', testId: 'results-card' }
		});
		const specialty = within(screen.getByTestId('results-card')).getByText('Καρδιολόγος');
		expect(specialty).toHaveClass('text-foreground');
		expect(specialty).not.toHaveClass('text-muted-foreground');
	});

	it('U-27.3 (negative): the description (two lines) stays muted', () => {
		render(SearchDoctorCard, {
			props: { ...base, doctor: card(), variant: 'list', testId: 'results-card' }
		});
		expect(slot('description')).toHaveClass('line-clamp-2', 'text-muted-foreground');
		expect(slot('description')).not.toHaveClass('text-foreground');
	});

	// Rewritten by f1b (the orchestrator's live measure 16:1x, U-27.4 «no change of layout»): f1's action was a 48 box
	// in the flow (`inline-flex min-h-touch`), which broke the home's line into three and spaced the list's line by 14.
	it('U-27.4 (app = web, f1b): the home’s «🔒 Συνδεθείτε για κόστος · ★ 4,9» — the first part alone is the action (lock, the words underlined, 600, the text colour), INLINE in the same line as « · ★ 4,9»', () => {
		render(SearchDoctorCard, { props: { ...base, doctor: signInCard } });
		const root = screen.getByTestId('home-doctor-card');
		const action = within(root).getByRole('button', { name: 'Συνδεθείτε για κόστος' });
		expect(action).toHaveAttribute('data-testid', 'home-doctor-card-sign-in');
		expect(action.closest('a')).toBeNull();
		expect(action.tagName).toBe('SPAN');
		expect(action).toHaveClass(
			'font-semibold',
			'text-foreground',
			'underline',
			'focus-visible:ring-3',
			'focus-visible:ring-ring/50',
			'box-decoration-clone'
		);
		// The lock and the first word never part; the rest wraps with the line.
		const lock = action.querySelector('[data-icon="lock-closed-outline"]') as Element;
		expect(lock).toHaveClass('icon-xs', 'inline-block', 'align-middle', 'mr-1');
		expect(lock.parentElement).toHaveClass('whitespace-nowrap');
		expect(lock.parentElement?.textContent).toBe('Συνδεθείτε');
		expect(action.textContent).toBe('Συνδεθείτε για κόστος');
		// The SAME line: the action and « · ★ 4,9» are words of one `<p>`, its two-line clamp and its 13 as before.
		const line = document.querySelector('[data-slot="home-doctor-card-price"]') as HTMLElement;
		expect(action.parentElement).toBe(line);
		expect(line).toContainElement(
			document.querySelector('[data-slot="home-doctor-card-rating"]') as HTMLElement
		);
		expect(line.tagName).toBe('P');
		expect(line.textContent?.replace(/\s+/gu, ' ').trim()).toBe('Συνδεθείτε για κόστος · ★ 4,9');
		expect(action).not.toContainElement(
			document.querySelector('[data-slot="home-doctor-card-rating"]') as HTMLElement
		);
		expect(line).not.toHaveClass('underline');
		expect(line).toHaveClass('line-clamp-2', 'text-label-lg', 'leading-tight');
	});

	it('U-27.4 (app = web, f1b): the list’s line — the same inline action, the line’s 14, height and one-line clamp as before', () => {
		render(SearchDoctorCard, {
			props: { ...base, doctor: signInCard, variant: 'list', testId: 'results-card' }
		});
		const line = slot('price') as HTMLElement;
		const action = within(line).getByRole('button', { name: 'Συνδεθείτε για κόστος' });
		expect(action).toHaveAttribute('data-testid', 'results-card-sign-in');
		expect(action.parentElement).toBe(line);
		expect(line).toHaveClass('line-clamp-1', 'text-body-sm');
		expect(line).not.toHaveClass('flex');
		expect(action).toHaveClass('font-semibold', 'text-foreground', 'underline');
		expect(action.closest('a')).toBeNull();
		expect(action.querySelector('[data-icon="lock-closed-outline"]')).not.toBeNull();
	});

	it('U-27.4 (f1b): no 48 box in the flow — the action keeps its line’s size and height; its target grows 4 on every side without layout (≥ 24 × 24, the application’s hitSlop 4), the line giving it the room back', () => {
		for (const variant of ['rail', 'list'] as const) {
			const view = render(SearchDoctorCard, {
				props: { ...base, doctor: signInCard, variant, testId: `card-${variant}` }
			});
			const action = screen.getByTestId(`card-${variant}-sign-in`);
			const classes = [...action.classList];
			for (const box of [
				'min-h-touch',
				'min-w-touch',
				'inline-flex',
				'flex',
				'block',
				'inline-block'
			])
				expect(classes, `${variant} ${box}`).not.toContain(box);
			// The line's own size and height: no text role or leading of its own.
			expect(
				classes.filter((name) => /^(text-(display|heading|title|body|label)-|leading-)/.test(name))
			).toEqual([]);
			// The press grows without layout: a pseudo-element 4 out on every side, over the card's link.
			expect(action).toHaveClass(
				'relative',
				'after:absolute',
				'after:-inset-1',
				'pointer-events-auto'
			);
			// The line keeps 4 of room for it and gives it back (its clamp would clip it): nothing moves.
			expect(action.parentElement).toHaveClass('-m-1', 'p-1');
			view.unmount();
		}
	});

	it('U-27.4 (f1b): a button’s keys — Enter, and Space on its release, press it; the page never scrolls on Space', async () => {
		const onSignIn = vi.fn();
		render(SearchDoctorCard, { props: { ...base, onSignIn, doctor: signInCard } });
		const action = screen.getByRole('button', { name: 'Συνδεθείτε για κόστος' });
		expect(action).toHaveAttribute('tabindex', '0');
		const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
		action.dispatchEvent(enter);
		expect(enter.defaultPrevented).toBe(true);
		expect(onSignIn).toHaveBeenCalledTimes(1);
		const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
		action.dispatchEvent(space);
		expect(space.defaultPrevented).toBe(true);
		expect(onSignIn).toHaveBeenCalledTimes(1);
		await fireEvent.keyUp(action, { key: ' ' });
		expect(onSignIn).toHaveBeenCalledTimes(2);
		// (negative) another key presses nothing.
		await fireEvent.keyDown(action, { key: 'a' });
		expect(onSignIn).toHaveBeenCalledTimes(2);
	});

	it('U-27.4 (app = web): pressed, it opens the sign-in — never the profile (negative: the card’s link is not followed); the link’s name carries no fee', async () => {
		const user = userEvent.setup({ delay: null });
		const onSignIn = vi.fn();
		const onFavorite = vi.fn();
		render(SearchDoctorCard, { props: { ...base, onSignIn, onFavorite, doctor: signInCard } });
		const link = screen.getByRole('link', { name: 'Προφίλ γιατρού Ανδρέας Παππάς' });
		const followed = vi.fn((event: Event) => event.preventDefault());
		link.addEventListener('click', followed);
		await user.click(screen.getByRole('button', { name: 'Συνδεθείτε για κόστος' }));
		expect(onSignIn).toHaveBeenCalledOnce();
		expect(followed).not.toHaveBeenCalled();
		expect(onFavorite).not.toHaveBeenCalled();
		expect(link.getAttribute('aria-label')).not.toContain('Συνδεθείτε');
		expect(screen.getAllByRole('link')).toHaveLength(1);
	});

	it('U-27.4: the Tab order is the card’s link, the heart over the photo, then the fee’s action in the lines', async () => {
		const user = userEvent.setup({ delay: null });
		render(SearchDoctorCard, { props: { ...base, doctor: signInCard } });
		await user.tab();
		expect(document.activeElement).toBe(
			screen.getByRole('link', { name: 'Προφίλ γιατρού Ανδρέας Παππάς' })
		);
		await user.tab();
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Αποθήκευσε γιατρό Ανδρέας Παππάς' })
		);
		await user.tab();
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Συνδεθείτε για κόστος' })
		);
	});

	it('U-27.4 (negative): with a price («Από 60 €») nothing changes — words in the line, no button, no lock', () => {
		render(SearchDoctorCard, { props: { ...base, doctor: card() } });
		const root = screen.getByTestId('home-doctor-card');
		expect(within(root).queryByTestId('home-doctor-card-sign-in')).toBeNull();
		expect(root.querySelector('[data-icon="lock-closed-outline"]')).toBeNull();
		const line = document.querySelector('[data-slot="home-doctor-card-price"]') as HTMLElement;
		expect(line).toHaveClass('text-foreground', 'font-normal', 'line-clamp-2');
		expect(line.textContent?.replace(/\s+/gu, ' ').trim()).toBe('Από 60 € · ★ 4,9');
		expect(within(root).getAllByRole('button')).toHaveLength(1);
		// f1b: the line is the one before f1, class for class (no room taken and given back).
		expect([...line.classList].sort()).toEqual(
			['font-normal', 'leading-tight', 'line-clamp-2', 'text-foreground', 'text-label-lg'].sort()
		);
	});

	it('U-27.4 (negative, f1b): with a price the list’s line is the one before f1, class for class', () => {
		render(SearchDoctorCard, {
			props: { ...base, doctor: card(), variant: 'list', testId: 'results-card' }
		});
		const line = slot('price') as HTMLElement;
		expect([...line.classList].sort()).toEqual(
			['line-clamp-1', 'text-body-sm', 'text-foreground'].sort()
		);
		expect(within(line).queryByRole('button')).toBeNull();
	});
});

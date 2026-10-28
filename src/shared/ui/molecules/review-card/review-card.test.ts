import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ReviewCard from './review-card.svelte';

/** A `ResizeObserver` the test fires by hand (jsdom draws no box). */
class ManualResizeObserver {
	static last: ManualResizeObserver | null = null;
	constructor(private readonly callback: () => void) {
		ManualResizeObserver.last = this;
	}
	observe() {}
	unobserve() {}
	disconnect() {}
	fire() {
		this.callback();
	}
}

const TEST_IDS = {
	aspects: 'review-aspects',
	body: 'review-body',
	bodyBlock: 'review-body-block',
	cta: 'review-cta',
	ctaSlot: 'review-cta-slot'
};
const BASE = {
	authorName: 'Γιώργος Π.',
	authorInitial: 'Γ',
	dateLabel: 'Μάρτιος 2026',
	rating: 4,
	ratingLabel: '4 στα 5',
	body: 'Πολύ καλή εξυπηρέτηση και σωστή ενημέρωση για όλα.',
	aspects: 'Συνέπεια · Φιλικότητα',
	moreLabel: 'Εμφάνιση περισσότερων',
	testId: 'review',
	testIds: TEST_IDS
};

/** jsdom has no layout: the body's text is `textHeight` tall in a box `shown` tall. */
function lay(textHeight: number, shown: number) {
	vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
		return this.getAttribute('data-testid') === TEST_IDS.body ? textHeight : 0;
	});
	vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function (this: Element) {
		return this.getAttribute('data-testid') === TEST_IDS.body ? shown : 0;
	});
}

/** The document's `FontFaceSet` (jsdom has none): an event target the test fires `loadingdone` on. */
function stubFonts(): EventTarget {
	const fonts = new EventTarget();
	Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
	return fonts;
}

describe('ReviewCard', () => {
	afterEach(() => {
		Reflect.deleteProperty(document, 'fonts');
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		ManualResizeObserver.last = null;
	});

	it('U-02.2 (K5.9): the application’s review, class for class — the initial in a faint circle, name and date, stars, body (M-15)', () => {
		render(ReviewCard, { props: BASE });
		const card = screen.getByTestId('review');
		expect(card).toHaveClass(
			'flex',
			'flex-col',
			'gap-4',
			'rounded-lg',
			'bg-card/95',
			'px-4',
			'py-4',
			'min-h-review-card-min-h',
			'w-review-card-w'
		);
		const initial = card.querySelector('[data-slot="review-card-initial"]');
		expect(initial).toHaveClass(
			'flex',
			'size-avatar-md',
			'shrink-0',
			'items-center',
			'justify-center',
			'rounded-full',
			'bg-foreground/8'
		);
		expect(screen.getByText('Γ')).toHaveClass(
			'text-body-sm',
			'leading-tight',
			'font-semibold',
			'text-foreground'
		);
		expect(initial?.parentElement).toHaveClass('flex', 'flex-row', 'items-start', 'gap-3');
		expect(screen.getByText('Γιώργος Π.')).toHaveClass(
			'text-body-md',
			'font-semibold',
			'text-foreground'
		);
		expect(screen.getByText('Γιώργος Π.').parentElement).toHaveClass(
			'flex',
			'flex-1',
			'flex-col',
			'gap-1'
		);
		expect(screen.getByText('Μάρτιος 2026')).toHaveClass('text-body-sm', 'text-muted-foreground');
		expect(screen.getByTestId(TEST_IDS.body)).toHaveClass(
			'text-body-sm',
			'leading-relaxed',
			'text-foreground/88',
			'line-clamp-3',
			// Web only: the body's own line breaks, as a native text draws them.
			'whitespace-pre-line'
		);
	});

	it('U-03.1 (a11y): the stars are one image named by the caller, the first `rating` filled', () => {
		render(ReviewCard, { props: BASE });
		const stars = screen.getByRole('img', { name: '4 στα 5' });
		expect(stars).toHaveAttribute('data-variant', 'stars');
		const filled = stars.querySelectorAll('[data-filled="true"]');
		expect(filled).toHaveLength(4);
		expect(stars.querySelectorAll('[data-icon="star"]')).toHaveLength(5);
	});

	it('U-02.2 (rail): the 48 row under the body is always reserved; «more» shows only once the body is cut', async () => {
		vi.stubGlobal('ResizeObserver', ManualResizeObserver);
		const sizes = { text: 66, shown: 66 };
		vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
			return this.getAttribute('data-testid') === TEST_IDS.body ? sizes.text : 0;
		});
		vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function (this: Element) {
			return this.getAttribute('data-testid') === TEST_IDS.body ? sizes.shown : 0;
		});
		const user = userEvent.setup({ delay: null });
		const onMore = vi.fn();
		render(ReviewCard, { props: { ...BASE, onMore } });
		const slot = screen.getByTestId(TEST_IDS.ctaSlot);
		expect(slot).toHaveClass('flex', 'min-h-touch', 'flex-col', 'justify-center');
		expect(screen.queryByTestId(TEST_IDS.cta)).toBeNull();
		sizes.text = 110;
		ManualResizeObserver.last?.fire();
		await waitFor(() => expect(screen.getByTestId(TEST_IDS.cta)).toBeInTheDocument());
		const more = screen.getByRole('button', { name: 'Εμφάνιση περισσότερων' });
		expect(screen.getByText('Εμφάνιση περισσότερων')).toHaveClass('underline');
		await user.click(more);
		expect(onMore).toHaveBeenCalledOnce();
	});

	it('U-02.2 (MINOR-2): a font that arrives measures again — the clamped box keeps its three lines, the text grows past them', async () => {
		const fonts = stubFonts();
		const remove = vi.spyOn(fonts, 'removeEventListener');
		const sizes = { text: 66, shown: 66 };
		vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
			return this.getAttribute('data-testid') === TEST_IDS.body ? sizes.text : 0;
		});
		vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function (this: Element) {
			return this.getAttribute('data-testid') === TEST_IDS.body ? sizes.shown : 0;
		});
		const view = render(ReviewCard, { props: BASE });
		expect(screen.queryByTestId(TEST_IDS.cta)).toBeNull();
		sizes.text = 110;
		fonts.dispatchEvent(new Event('loadingdone'));
		await waitFor(() =>
			expect(screen.getByRole('button', { name: 'Εμφάνιση περισσότερων' })).toBeInTheDocument()
		);
		view.unmount();
		expect(remove).toHaveBeenCalledWith('loadingdone', expect.any(Function));
	});

	it('U-02.2 (negative): a cut body without `moreLabel` shows no button; the list shows all and the aspects, no slot', () => {
		lay(110, 66);
		const view = render(ReviewCard, { props: { ...BASE, moreLabel: undefined } });
		expect(screen.queryByTestId(TEST_IDS.cta)).toBeNull();
		expect(screen.getByTestId(TEST_IDS.ctaSlot)).toBeInTheDocument();
		expect(screen.queryByTestId(TEST_IDS.aspects)).toBeNull();
		view.unmount();
		render(ReviewCard, { props: { ...BASE, layout: 'list' } });
		expect(screen.getByTestId('review')).toHaveClass('w-full');
		expect(screen.getByTestId('review')).not.toHaveClass('w-review-card-w');
		expect(screen.getByTestId(TEST_IDS.body)).not.toHaveClass('line-clamp-3');
		expect(screen.queryByTestId(TEST_IDS.ctaSlot)).toBeNull();
		expect(screen.queryByTestId(TEST_IDS.cta)).toBeNull();
		expect(screen.getByTestId(TEST_IDS.aspects)).toHaveClass(
			'text-body-sm',
			'text-muted-foreground'
		);
	});

	it('U-03.1 (zones, light/dark): the same card at every width and only theme tokens', () => {
		const { container } = render(ReviewCard, { props: BASE });
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});

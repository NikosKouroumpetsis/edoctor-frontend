import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PhotoCarousel from './photo-carousel.svelte';

const slides = ['a', 'b', 'c', 'd', 'e'].map((name, index) => ({
	uri: `data:image/png;base64,${name}`,
	ariaLabel: `Φωτογραφία ${index + 1} από 5`
}));
const scrollLabels = { previous: 'Προηγούμενη φωτογραφία', next: 'Επόμενη φωτογραφία' };

const trackOf = (container: HTMLElement) =>
	container.querySelector('[data-slot="photo-carousel-track"]') as HTMLElement;
const mounted = (container: HTMLElement) =>
	[...container.querySelectorAll('[data-slot="photo-carousel-slide"]')].map((slide) =>
		slide.querySelector('img')
			? 'img'
			: slide.querySelector('[data-slot="photo-carousel-pending"]')
				? '·'
				: '?'
	);

/** jsdom has no layout: give the track a page width and a position, then let it scroll. */
async function scrollTo(track: HTMLElement, page: number) {
	Object.defineProperty(track, 'clientWidth', { configurable: true, value: 300 });
	Object.defineProperty(track, 'scrollLeft', { configurable: true, value: page * 300 });
	await fireEvent.scroll(track);
}

describe('PhotoCarousel', () => {
	afterEach(() => vi.restoreAllMocks());

	it('U-03.1 (M-02): a snapping track, one photo a page, rounded xl on the muted surface, swiped by touch', () => {
		const { container } = render(PhotoCarousel, {
			props: { slides, imageClass: 'h-card-list-media' }
		});
		const track = trackOf(container);
		expect(track).toHaveClass(
			'flex',
			'snap-x',
			'snap-mandatory',
			'overflow-x-auto',
			'scroll-smooth',
			'pointer-events-auto'
		);
		// U-12.1: it scrolls smoothly whatever the motion setting (R2's `motion-safe:` is gone).
		expect(track).not.toHaveClass('motion-safe:scroll-smooth');
		const first = container.querySelector('[data-slot="photo-carousel-slide"]') as HTMLElement;
		expect(first).toHaveClass('w-full', 'shrink-0', 'snap-start', 'snap-always');
		const image = first.querySelector('img') as HTMLImageElement;
		expect(image).toHaveClass('rounded-xl', 'bg-muted', 'object-cover', 'h-card-list-media');
		expect(image).toHaveAttribute('alt', 'Φωτογραφία 1 από 5');
	});

	it('U-03.1 (M-02): only the shown photo and its neighbours mount an image, before any scroll (the server’s render too)', async () => {
		const { container } = render(PhotoCarousel, { props: { slides } });
		expect(mounted(container)).toEqual(['img', 'img', '·', '·', '·']);
		await scrollTo(trackOf(container), 2);
		expect(mounted(container)).toEqual(['·', 'img', 'img', 'img', '·']);
		const wide = render(PhotoCarousel, { props: { slides, neighborWindow: 2 } });
		expect(mounted(wide.container)).toEqual(['img', 'img', 'img', '·', '·']);
	});

	it('U-03.1: the first photo loads as the caller asks (a first row `eager`), the others always lazily', () => {
		const { container } = render(PhotoCarousel, { props: { slides, loading: 'eager' } });
		const images = [...container.querySelectorAll('img')];
		expect(images[0]).toHaveAttribute('loading', 'eager');
		expect(images[1]).toHaveAttribute('loading', 'lazy');
	});

	it('U-03.1 (M-02): dots over the photo, 6 wide, the shown one in the card colour and the rest at 50 %; they follow the scroll', async () => {
		const { container } = render(PhotoCarousel, { props: { slides } });
		const dots = container.querySelector('[data-slot="photo-carousel-dots"]') as HTMLElement;
		expect(dots).toHaveAttribute('aria-hidden', 'true');
		expect(dots).toHaveClass('pointer-events-none', 'absolute', 'inset-x-0', 'bottom-3', 'gap-1.5');
		const all = () => [...dots.querySelectorAll('[data-slot="photo-carousel-dot"]')];
		expect(all()).toHaveLength(5);
		expect(all()[0]).toHaveClass('size-1.5', 'rounded-full', 'bg-card');
		expect(all()[1]).toHaveClass('bg-card/50');
		await scrollTo(trackOf(container), 3);
		expect(all()[3]).toHaveAttribute('data-active', 'true');
		expect(all()[0]).toHaveClass('bg-card/50');
	});

	it('U-03.1 (negative): one photo draws no dots, no arrows and no counter', () => {
		const { container } = render(PhotoCarousel, {
			props: {
				slides: [slides[0]],
				scrollLabels,
				counterLabel: (p: number, t: number) => `${p} / ${t}`
			}
		});
		expect(container.querySelector('[data-slot="photo-carousel-dots"]')).toBeNull();
		expect(container.querySelector('[data-slot="photo-carousel-counter"]')).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('S-32.13: a cover that does not load makes the whole gallery read as no photo — one silhouette, no dots, arrows, counter', async () => {
		const { container } = render(PhotoCarousel, {
			props: { slides, scrollLabels, counterLabel: (p: number, t: number) => `${p} / ${t}` }
		});
		await fireEvent.error(container.querySelector('img') as HTMLImageElement);
		const root = container.querySelector('[data-slot="photo-carousel"]') as HTMLElement;
		expect(root).toHaveAttribute('data-state', 'no-photo');
		expect(container.querySelectorAll('[data-slot="media-placeholder"]')).toHaveLength(1);
		expect(container.querySelector('img')).toBeNull();
		expect(container.querySelector('[data-slot="photo-carousel-track"]')).toBeNull();
		expect(container.querySelector('[data-slot="photo-carousel-dots"]')).toBeNull();
		expect(container.querySelector('[data-slot="photo-carousel-counter"]')).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();
		expect(container.textContent).not.toMatch(/1 \/ 5|Φωτογραφία/);
	});

	it('S-32.13: a later photo that does not load draws the silhouette in its own page; the gallery stays', async () => {
		const { container } = render(PhotoCarousel, {
			props: { slides, imageClass: 'h-card-list-media' }
		});
		await fireEvent.error(container.querySelectorAll('img')[1] as HTMLImageElement);
		const second = container.querySelectorAll(
			'[data-slot="photo-carousel-slide"]'
		)[1] as HTMLElement;
		expect(second.querySelector('[data-slot="media-placeholder"]')).toHaveClass(
			'rounded-xl',
			'h-card-list-media'
		);
		expect(container.querySelector('[data-slot="photo-carousel-dots"]')).not.toBeNull();
	});

	it('S-32.8: no photos at all is the silhouette alone', () => {
		const { container } = render(PhotoCarousel, { props: { slides: [] } });
		expect(container.querySelectorAll('[data-slot="media-placeholder"]')).toHaveLength(1);
		expect(container.querySelector('[data-slot="photo-carousel-dots"]')).toBeNull();
	});

	// U-09.3 gave the gallery the `Carousel`'s arrows: the same place (12 from the photo's sides, `left-1`/`right-1`
	// for the 48 target, was 8 with `left-0`/`right-0`), Airbnb's 32 white circle and 12 chevron (was the outline
	// circle), shown with a pointer on hover or focus and always on touch (was `opacity-0` on every screen).
	it('U-09.3 (Airbnb): ‹ › only with names, from 1128, over the photo at the Carousel’s place; the ends hide theirs; a press pages one photo', async () => {
		const user = userEvent.setup({ delay: null });
		const { container } = render(PhotoCarousel, { props: { slides, scrollLabels } });
		const previous = screen.getByRole('button', { name: 'Προηγούμενη φωτογραφία' });
		const next = screen.getByRole('button', { name: 'Επόμενη φωτογραφία' });
		for (const arrow of [previous, next]) {
			expect(arrow).toHaveClass(
				'hidden',
				'laptop:flex',
				'absolute',
				'top-1/2',
				'-translate-y-1/2',
				'can-hover:opacity-0',
				'can-hover:group-hover/carousel:opacity-100',
				'can-hover:group-focus-within/carousel:opacity-100',
				'disabled:invisible',
				'size-touch'
			);
			expect(arrow.className.split(' ')).not.toContain('opacity-0');
			expect(arrow.firstElementChild).toHaveClass(
				'size-control-xs',
				'bg-media-scrim/90',
				'shadow-raised'
			);
			expect(arrow.querySelector('[data-slot="ionicon"]')).toHaveClass('icon-xs');
		}
		expect(previous).toHaveClass('left-1');
		expect(next).toHaveClass('right-1');
		expect(container.querySelector('[data-slot="photo-carousel"]')).toHaveClass('group/carousel');
		expect(previous).toBeDisabled();
		expect(next).toBeEnabled();
		const track = trackOf(container);
		const scrollBy = vi.fn();
		track.scrollBy = scrollBy;
		Object.defineProperty(track, 'clientWidth', { configurable: true, value: 300 });
		await user.click(next);
		expect(scrollBy).toHaveBeenCalledWith({ left: 300 });
		await scrollTo(track, 4);
		expect(next).toBeDisabled();
		expect(previous).toBeEnabled();
		await user.click(previous);
		expect(scrollBy).toHaveBeenLastCalledWith({ left: -300 });
	});

	it('U-03.1 (NIT-4 of dyad 3): on the last photo the focus on «next» moves to «previous», and back on the first', async () => {
		const { container } = render(PhotoCarousel, { props: { slides, scrollLabels } });
		const previous = screen.getByRole('button', { name: scrollLabels.previous });
		const next = screen.getByRole('button', { name: scrollLabels.next });
		const track = trackOf(container);
		await scrollTo(track, 3);
		next.focus();
		await scrollTo(track, 4);
		expect(next).toBeDisabled();
		expect(previous).toHaveFocus();
		// Straight back to the first photo: both arrows flip in one update.
		await scrollTo(track, 0);
		expect(previous).toBeDisabled();
		expect(next).toHaveFocus();
	});

	it('U-03.1 (negative): without names there are no arrows, and the zone is the caller’s (`tablet`)', () => {
		const none = render(PhotoCarousel, { props: { slides } });
		expect(none.queryAllByRole('button')).toHaveLength(0);
		none.unmount();
		render(PhotoCarousel, { props: { slides, scrollLabels, controlsFrom: 'tablet' } });
		expect(screen.getByRole('button', { name: 'Επόμενη φωτογραφία' })).toHaveClass(
			'hidden',
			'tablet:flex'
		);
	});

	it('S-32.8: the «2 / 5» counter replaces the dots, in the caller’s words, and follows the scroll', async () => {
		const { container } = render(PhotoCarousel, {
			props: { slides, counterLabel: (position: number, total: number) => `${position} / ${total}` }
		});
		const counter = container.querySelector('[data-slot="photo-carousel-counter"]') as HTMLElement;
		expect(counter).toHaveTextContent('1 / 5');
		expect(counter).toHaveClass(
			'absolute',
			'right-4',
			'bottom-3',
			'rounded-full',
			'bg-secondary/75',
			'text-body-sm',
			'font-semibold',
			'text-secondary-foreground'
		);
		expect(container.querySelector('[data-slot="photo-carousel-dots"]')).toBeNull();
		await scrollTo(trackOf(container), 1);
		expect(counter).toHaveTextContent('2 / 5');
	});

	it('U-03.1 (a11y): inside a card link every photo opens it too, as a pointer-only twin out of the Tab order and hidden', () => {
		const { container } = render(PhotoCarousel, { props: { slides, href: '#card' } });
		const links = [...container.querySelectorAll('[data-slot="photo-carousel-link"]')];
		expect(links).toHaveLength(5);
		for (const link of links) {
			expect(link).toHaveAttribute('href', '#card');
			expect(link).toHaveAttribute('tabindex', '-1');
			expect(link).toHaveAttribute('aria-hidden', 'true');
		}
		expect(screen.queryAllByRole('link')).toHaveLength(0);
		expect(container.querySelector('img')).toHaveAttribute('alt', '');
	});
});

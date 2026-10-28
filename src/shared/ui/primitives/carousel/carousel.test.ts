import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { reduceMotion } from '../../../../../vitest-mocks/reduce-motion';
import userEvent from '@testing-library/user-event';
import Harness from './carousel.harness.svelte';
import { m } from '$paraglide/messages.js';

function track(): HTMLElement {
	return document.querySelector('[data-slot="carousel-content"]') as HTMLElement;
}

describe('Carousel', () => {
	it('advances and rewinds slides, translating the track', async () => {
		const user = userEvent.setup();
		render(Harness);
		expect(track().style.transform).toBe('translateX(-0%)');

		await user.click(screen.getByRole('button', { name: 'Next slide' }));
		expect(track().style.transform).toBe('translateX(-100%)');

		await user.click(screen.getByRole('button', { name: 'Previous slide' }));
		expect(track().style.transform).toBe('translateX(-0%)');
	});

	it('disables previous at the start and next at the end (no loop)', async () => {
		const user = userEvent.setup();
		render(Harness);
		expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled();

		await user.click(screen.getByRole('button', { name: 'Next slide' }));
		await user.click(screen.getByRole('button', { name: 'Next slide' }));
		expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled();
	});

	it('jumps to a slide via its dot', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Go to slide 3' }));
		expect(track().style.transform).toBe('translateX(-200%)');
	});

	it('U-03.5 (delta R1 of the application): the catalogs name the slides with the application’s words', () => {
		expect(m.common_go_to_slide({ position: 3 }, { locale: 'el' })).toBe(
			'Μετάβαση στη διαφάνεια 3'
		);
		expect(m.common_next_slide({}, { locale: 'el' })).toBe('Επόμενη διαφάνεια');
		expect(m.common_previous_slide({}, { locale: 'el' })).toBe('Προηγούμενη διαφάνεια');
		expect(m.common_go_to_slide({ position: 1 }, { locale: 'en' })).toBe('Go to slide 1');
		expect(m.common_next_slide({}, { locale: 'en' })).toBe('Next slide');
		expect(m.common_previous_slide({}, { locale: 'en' })).toBe('Previous slide');
	});

	afterEach(() => vi.useRealTimers());

	it('U-09.3: the arrows sit over the slide — its grid cell, centred on its height, 12 from its sides', () => {
		const { container } = render(Harness);
		const root = container.querySelector('[data-slot="carousel"]');
		const viewport = container.querySelector('[data-slot="carousel-viewport"]');
		expect(root).toHaveClass('group/carousel', 'grid', 'grid-cols-1');
		expect(viewport).toHaveClass('col-start-1', 'row-start-1', 'min-w-0', 'overflow-hidden');
		const previous = screen.getByRole('button', { name: 'Previous slide' });
		const next = screen.getByRole('button', { name: 'Next slide' });
		for (const arrow of [previous, next]) {
			// The slide's cell, not a row of its own under it (the old place: a centred row below the slides).
			expect(arrow).toHaveClass('z-10', 'col-start-1', 'row-start-1', 'self-center', 'size-touch');
		}
		// The 48 target 4 from the side puts the 32 circle 12 from it (Airbnb's 12).
		expect(previous).toHaveClass('justify-self-start', 'ml-1');
		expect(next).toHaveClass('justify-self-end', 'mr-1');
		// The dots take the next row: after the slides in the DOM, placed by nothing.
		const dots = container.querySelector('[data-slot="carousel-dots"]');
		expect(dots?.className).not.toMatch(/row-start|col-start/);
	});

	it('U-09.3: the root stays `relative` — a caller’s own `absolute` parts sit on the carousel, never on the page', () => {
		const { container } = render(Harness);
		const root = container.querySelector('[data-slot="carousel"]');
		expect(root).toHaveClass('relative');
		expect(root).not.toHaveClass('static');
	});

	it('U-09.3: Airbnb’s arrow — a 32 circle of the 90 % white scrim with a shadow and a 12 chevron', () => {
		render(Harness);
		const next = screen.getByRole('button', { name: 'Next slide' });
		const shape = next.firstElementChild;
		expect(shape).toHaveClass(
			'size-control-xs',
			'rounded-full',
			'bg-media-scrim/90',
			'shadow-raised',
			'group-focus-visible/carousel-arrow:ring-3'
		);
		expect(next.querySelector('[data-icon="chevron-forward"]')).toHaveClass(
			'icon-xs',
			'text-secondary'
		);
		expect(
			screen.getByRole('button', { name: 'Previous slide' }).querySelector('[data-icon]')
		).toHaveAttribute('data-icon', 'chevron-back');
	});

	it('U-09.3: with a pointer they wait for it (or the focus) over the carousel; on touch they always show', () => {
		render(Harness);
		const next = screen.getByRole('button', { name: 'Next slide' });
		expect(next).toHaveClass(
			'can-hover:opacity-0',
			'can-hover:group-hover/carousel:opacity-100',
			'can-hover:group-focus-within/carousel:opacity-100',
			'transition-opacity'
		);
		// U-12.1: they fade whatever the motion setting (R2's `motion-reduce:transition-none` is gone).
		expect(next).not.toHaveClass('motion-reduce:transition-none');
		// Nothing hides them without `can-hover:` (a touch screen has no hover).
		expect(next.className.split(' ')).not.toContain('opacity-0');
	});

	it('U-09.3: no arrow out at an end without `loop` (it hides, so it holds no place); with `loop` both stay', async () => {
		const user = userEvent.setup();
		render(Harness);
		const previous = screen.getByRole('button', { name: 'Previous slide' });
		expect(previous).toBeDisabled();
		expect(previous).toHaveClass('disabled:invisible');
		await user.click(screen.getByRole('button', { name: 'Go to slide 3' }));
		expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled();
		const looped = render(Harness, { props: { loop: true } });
		const [loopPrevious] = looped.getAllByRole('button', { name: 'Previous slide' }).slice(-1);
		expect(loopPrevious).toBeEnabled();
	});

	it('U-09.3: at an end the keyboard’s focus on the arrow that hides moves to the other one', async () => {
		const user = userEvent.setup();
		render(Harness);
		const next = screen.getByRole('button', { name: 'Next slide' });
		await user.click(next);
		next.focus();
		await user.keyboard('{Enter}');
		expect(next).toBeDisabled();
		await vi.waitFor(() =>
			expect(screen.getByRole('button', { name: 'Previous slide' })).toHaveFocus()
		);
	});

	it('U-11.3: autoPlay moves on every interval (the application’s); a press with its focus re-arms it, the pointer pauses it', async () => {
		vi.useFakeTimers();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		const { container } = render(Harness, { props: { autoPlay: true, autoPlayIntervalMs: 2000 } });
		const root = container.querySelector('[data-slot="carousel"]') as HTMLElement;
		await vi.advanceTimersByTimeAsync(1999);
		expect(track().style.transform).toBe('translateX(-0%)');
		await vi.advanceTimersByTimeAsync(1);
		expect(track().style.transform).toBe('translateX(-100%)');
		await vi.advanceTimersByTimeAsync(1500);
		// A real press (pointer + focus, as the browser): the dot takes the focus, the pointer is over the carousel.
		const dot = screen.getByRole('button', { name: 'Go to slide 1' });
		await user.click(dot);
		expect(dot).toHaveFocus();
		expect(track().style.transform).toBe('translateX(-0%)');
		await vi.advanceTimersByTimeAsync(6000);
		expect(track().style.transform).toBe('translateX(-0%)');
		// The pointer leaves; the pressed dot keeps the focus and the timer runs again from there.
		await user.unhover(root);
		await fireEvent.pointerLeave(root);
		expect(dot).toHaveFocus();
		await vi.advanceTimersByTimeAsync(1999);
		expect(track().style.transform).toBe('translateX(-0%)');
		await vi.advanceTimersByTimeAsync(1);
		expect(track().style.transform).toBe('translateX(-100%)');
		await vi.advanceTimersByTimeAsync(2000);
		expect(track().style.transform).toBe('translateX(-200%)');
		// Without `loop` it stops at the last slide.
		await vi.advanceTimersByTimeAsync(4000);
		expect(track().style.transform).toBe('translateX(-200%)');
	});

	it('U-11.3 (negative): the keyboard’s focus in the carousel pauses autoPlay until it leaves (WCAG 2.2.2)', async () => {
		vi.useFakeTimers();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(Harness, { props: { autoPlay: true, autoPlayIntervalMs: 2000 } });
		await user.tab();
		expect(screen.getByRole('button', { name: 'Next slide' })).toHaveFocus();
		await vi.advanceTimersByTimeAsync(6000);
		expect(track().style.transform).toBe('translateX(-0%)');
		screen.getByRole('button', { name: 'Next slide' }).blur();
		await vi.advanceTimersByTimeAsync(2000);
		expect(track().style.transform).toBe('translateX(-100%)');
	});

	it('U-11.3 (negative): autoPlay is off by default', async () => {
		vi.useFakeTimers();
		render(Harness);
		await vi.advanceTimersByTimeAsync(10000);
		expect(track().style.transform).toBe('translateX(-0%)');
	});

	// Rewritten from U-09.13 (negative, «never runs under reduced motion»): U-12.1 cancelled the pause by setting.
	it('U-12.1: under reduced motion autoPlay still moves on (the pause is the pointer’s or the keyboard’s only)', async () => {
		vi.useFakeTimers();
		reduceMotion();
		render(Harness, { props: { autoPlay: true, autoPlayIntervalMs: 2000 } });
		await vi.advanceTimersByTimeAsync(2000);
		expect(track().style.transform).toBe('translateX(-100%)');
	});

	// Rewritten from U-09.13 («stops moving under reduced motion»): the track slides whatever the setting.
	it('U-12.1: the track moves on the standard motion, whatever the motion setting', () => {
		render(Harness);
		expect(track()).toHaveClass('transition-transform', 'duration-standard', 'ease-standard');
		expect(track()).not.toHaveClass('motion-reduce:transition-none');
	});
});

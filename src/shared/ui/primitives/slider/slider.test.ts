import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Slider from './slider.svelte';

describe('Slider', () => {
	it('adjusts a single value with the keyboard and reports changes', async () => {
		const user = userEvent.setup({ delay: null });
		const onValueChange = vi.fn();
		render(Slider, { props: { value: 50, 'aria-label': 'Volume', onValueChange } });
		const thumb = screen.getByRole('slider', { name: 'Volume' });

		thumb.focus();
		await user.keyboard('{ArrowRight}');
		expect(thumb).toHaveAttribute('aria-valuenow', '51');
		await user.keyboard('{ArrowLeft}{ArrowLeft}');
		expect(thumb).toHaveAttribute('aria-valuenow', '49');
		await user.keyboard('{Home}');
		expect(thumb).toHaveAttribute('aria-valuenow', '0');
		await user.keyboard('{End}');
		expect(thumb).toHaveAttribute('aria-valuenow', '100');
		expect(onValueChange).toHaveBeenLastCalledWith(100);
	});

	it('respects step and clamps to bounds', async () => {
		const user = userEvent.setup({ delay: null });
		render(Slider, { props: { value: 0, min: 0, max: 10, step: 5, 'aria-label': 'Steps' } });
		const thumb = screen.getByRole('slider', { name: 'Steps' });
		thumb.focus();
		await user.keyboard('{ArrowRight}');
		expect(thumb).toHaveAttribute('aria-valuenow', '5');
		await user.keyboard('{ArrowLeft}{ArrowLeft}');
		expect(thumb).toHaveAttribute('aria-valuenow', '0');
	});

	it('defaults the track/thumb to the default scale and applies sm/lg', () => {
		const def = render(Slider, { props: { value: 50, 'aria-label': 'd' } });
		expect(def.container.querySelector('[data-slot="slider-track"]')).toHaveClass('h-1.5');
		expect(def.container.querySelector('[data-slot="slider-thumb-dot"]')).toHaveClass('size-4');
		def.unmount();

		const sm = render(Slider, { props: { value: 50, 'aria-label': 's', size: 'sm' } });
		expect(sm.container.querySelector('[data-slot="slider-track"]')).toHaveClass('h-1');
		expect(sm.container.querySelector('[data-slot="slider-thumb-dot"]')).toHaveClass('size-3');
		sm.unmount();

		const lg = render(Slider, { props: { value: 50, 'aria-label': 'l', size: 'lg' } });
		expect(lg.container.querySelector('[data-slot="slider-track"]')).toHaveClass('h-2');
		expect(lg.container.querySelector('[data-slot="slider-thumb-dot"]')).toHaveClass('size-5');
	});

	it('defaults to the primary tone and repaints range/thumb for tone="accent"', () => {
		const def = render(Slider, { props: { value: [20, 80], 'aria-label': 'p' } });
		expect(def.container.querySelector('[data-slot="slider-range"]')).toHaveClass('bg-primary');
		expect(def.container.querySelector('[data-slot="slider-thumb-dot"]')).toHaveClass(
			'border-primary'
		);
		def.unmount();

		const accent = render(Slider, {
			props: { value: [20, 80], tone: 'accent', 'aria-label': 'a' }
		});
		expect(accent.container.querySelector('[data-slot="slider-range"]')).toHaveClass('bg-accent');
		expect(accent.container.querySelector('[data-slot="slider-thumb-dot"]')).toHaveClass(
			'border-accent'
		);
	});

	it('renders two thumbs for a range and prevents them from crossing', async () => {
		const user = userEvent.setup({ delay: null });
		render(Slider, { props: { value: [20, 30], 'aria-label': 'Range' } });
		const thumbs = screen.getAllByRole('slider', { name: 'Range' });
		expect(thumbs).toHaveLength(2);

		// Push the lower thumb up past the upper one; it should stop at 30.
		thumbs[0].focus();
		for (let i = 0; i < 20; i++) await user.keyboard('{ArrowRight}');
		expect(Number(thumbs[0].getAttribute('aria-valuenow'))).toBeLessThanOrEqual(30);
	});

	it('moves the value to the pressed point from the touch box, as the track does, and grabs only from the dot', async () => {
		const { container } = render(Slider, { props: { value: 50, 'aria-label': 'Volume' } });
		const thumb = screen.getByRole('slider', { name: 'Volume' });
		const track = container.querySelector('[data-slot="slider-track"]') as HTMLElement;
		const dot = container.querySelector('[data-slot="slider-thumb-dot"]') as HTMLElement;
		const rect = { left: 0, width: 200, top: 0, height: 6, right: 200, bottom: 6, x: 0, y: 0 };
		track.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect });

		await fireEvent.pointerDown(dot, { clientX: 150 });
		await fireEvent.pointerUp(window);
		expect(thumb).toHaveAttribute('aria-valuenow', '50');

		await fireEvent.pointerDown(thumb, { clientX: 120 });
		await fireEvent.pointerUp(window);
		expect(thumb).toHaveAttribute('aria-valuenow', '60');

		await fireEvent.pointerDown(track, { clientX: 40 });
		await fireEvent.pointerUp(window);
		expect(thumb).toHaveAttribute('aria-valuenow', '20');
	});

	// 🔴 S-26.9: each thumb says its value as the screen shows it (`formatValue`), the plain number by default.
	it('S-26.9: slider announces its shown value, never a percentage', () => {
		const formatted = render(Slider, {
			props: {
				value: [80, 420],
				min: 8,
				max: 420,
				'aria-label': 'Τιμή',
				formatValue: (value: number, thumbIndex: number) =>
					`€${value}${thumbIndex === 1 ? '+' : ''}`
			}
		});
		expect(
			screen.getAllByRole('slider').map((thumb) => thumb.getAttribute('aria-valuetext'))
		).toEqual(['€80', '€420+']);
		formatted.unmount();

		render(Slider, { props: { value: 50, 'aria-label': 'Volume' } });
		expect(screen.getByRole('slider', { name: 'Volume' })).toHaveAttribute('aria-valuetext', '50');
	});

	// U-06.2: a thumb's 48 box at either end ran 24 past the slider (the owner saw it at 4θ); the rail the thumbs sit
	// on is inset by half that box, the track spans the rail.
	it('U-06.2: the thumbs sit on a rail inset by half the touch box, so both ends stay inside', () => {
		const { container } = render(Slider, { props: { value: [0, 100], 'aria-label': 'Εύρος' } });
		const rail = container.querySelector('[data-slot="slider-rail"]') as HTMLElement;
		expect(rail).toHaveClass('relative', 'mx-6');
		expect(rail.parentElement).toHaveAttribute('data-slot', 'slider');
		for (const thumb of screen.getAllByRole('slider')) {
			expect(thumb.parentElement).toBe(rail);
			expect(thumb).toHaveClass('size-touch', '-translate-x-1/2');
		}
		expect(container.querySelector('[data-slot="slider-track"]')?.parentElement).toBe(rail);
	});

	// U-06.10 + NIT-1 (R1 review): a press on the dot is not cancelled and focuses the thumb without a scroll (Safari
	// and Firefox on macOS focus no pressed button, and the arrows must move it after a drag). Chrome's scripted focus
	// matches `:focus-visible` (the orchestrator's measurement), so `focusVisible: false`: the press shows no ring.
	it('U-06.10: pressing the dot focuses the thumb, not visibly, without cancelling the press or scrolling', async () => {
		const { container } = render(Slider, { props: { value: 50, 'aria-label': 'Ένταση' } });
		const thumb = screen.getByRole('slider', { name: 'Ένταση' });
		const dot = container.querySelector('[data-slot="slider-thumb-dot"]') as HTMLElement;
		const focus = vi.spyOn(thumb, 'focus');
		const press = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 0 });
		dot.dispatchEvent(press);
		await fireEvent.pointerUp(window);
		expect(press.defaultPrevented).toBe(false);
		expect(focus).toHaveBeenCalledWith({ preventScroll: true, focusVisible: false });
		expect(thumb).toHaveFocus();
		const pressed = [...thumb.classList, ...dot.classList];
		expect(
			pressed.filter((name) => /^(focus|active|focus-within):(ring|outline|border)/.test(name))
		).toEqual([]);
	});

	it('U-06.10: the thumb draws no outline; its ring is only the keyboard’s (`focus-visible`)', () => {
		const { container } = render(Slider, { props: { value: 50, 'aria-label': 'Ένταση' } });
		const thumb = screen.getByRole('slider', { name: 'Ένταση' });
		expect(thumb).toHaveClass('outline-none', '[-webkit-tap-highlight-color:transparent]');
		const dot = container.querySelector('[data-slot="slider-thumb-dot"]') as HTMLElement;
		const rings = [...thumb.classList, ...dot.classList].filter((name) =>
			/(^|:)(ring|outline)-/.test(name)
		);
		expect(rings.length).toBeGreaterThan(0);
		for (const ring of rings) {
			if (ring === 'outline-none') continue;
			expect(ring).toMatch(/^group-focus-visible:/);
		}
	});
});

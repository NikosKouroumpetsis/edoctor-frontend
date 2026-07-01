import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
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
		expect(def.container.querySelector('[data-slot="slider-thumb"]')).toHaveClass('size-4');
		def.unmount();

		const sm = render(Slider, { props: { value: 50, 'aria-label': 's', size: 'sm' } });
		expect(sm.container.querySelector('[data-slot="slider-track"]')).toHaveClass('h-1');
		expect(sm.container.querySelector('[data-slot="slider-thumb"]')).toHaveClass('size-3');
		sm.unmount();

		const lg = render(Slider, { props: { value: 50, 'aria-label': 'l', size: 'lg' } });
		expect(lg.container.querySelector('[data-slot="slider-track"]')).toHaveClass('h-2');
		expect(lg.container.querySelector('[data-slot="slider-thumb"]')).toHaveClass('size-5');
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
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MapPricePin from './map-price-pin.svelte';

const shapeOf = (button: HTMLElement) =>
	button.querySelector('[data-slot="map-price-pin-shape"]') as HTMLElement;

describe('MapPricePin', () => {
	it('U-24.4: a price is the white 28 pill, 13/700, in the 48 box centred on the point', () => {
		render(MapPricePin, {
			props: { label: '60 €', 'aria-label': 'Α. Παππάς, 60 €', testId: 'pin' }
		});
		const pin = screen.getByRole('button', { name: 'Α. Παππάς, 60 €' });
		expect(pin).toHaveClass('min-h-touch', 'min-w-touch');
		expect(pin).toHaveAttribute('data-kind', 'price');
		expect(pin).toHaveAttribute('aria-pressed', 'false');
		expect(shapeOf(pin)).toHaveClass(
			'h-map-pin',
			'rounded-full',
			'bg-card',
			'text-foreground',
			'text-label-lg',
			'font-bold',
			'shadow-raised'
		);
		expect(shapeOf(pin)).toHaveTextContent('60 €');
	});

	it('U-24.4: without a price it is the 14 dark dot with a white ring (a fee that needs sign-in)', () => {
		render(MapPricePin, { props: { label: null, 'aria-label': 'Α. Παππάς' } });
		const pin = screen.getByRole('button', { name: 'Α. Παππάς' });
		expect(pin).toHaveAttribute('data-kind', 'dot');
		expect(shapeOf(pin)).toHaveClass(
			'size-3.5',
			'rounded-full',
			'border-2',
			'border-card',
			'bg-foreground'
		);
		expect(shapeOf(pin)).toHaveTextContent('');
	});

	it('U-24.4: selected ⇒ dark and 8 % bigger (the dot: accent); pointed at from the list ⇒ bigger only', async () => {
		const { rerender } = render(MapPricePin, {
			props: { label: '60 €', selected: true, 'aria-label': 'Α' }
		});
		const pin = screen.getByRole('button', { name: 'Α' });
		expect(pin).toHaveAttribute('aria-pressed', 'true');
		expect(pin).toHaveAttribute('data-state', 'selected');
		expect(shapeOf(pin)).toHaveClass('bg-secondary', 'text-secondary-foreground', 'scale-108');

		await rerender({ label: null, selected: true, 'aria-label': 'Α' });
		expect(shapeOf(pin)).toHaveClass('bg-accent', 'scale-108');

		await rerender({ label: '60 €', selected: false, hot: true, 'aria-label': 'Α' });
		expect(pin).toHaveAttribute('data-state', 'hot');
		expect(shapeOf(pin)).toHaveClass('bg-card', 'scale-108');
	});

	it('U-24.4 (negative): an idle pin is neither dark nor bigger, and the press reaches the caller', async () => {
		const onclick = vi.fn();
		render(MapPricePin, { props: { label: '60 €', 'aria-label': 'Α', onclick } });
		const pin = screen.getByRole('button', { name: 'Α' });
		expect(shapeOf(pin)).not.toHaveClass('bg-secondary', 'scale-108');
		await userEvent.setup({ delay: null }).click(pin);
		expect(onclick).toHaveBeenCalledOnce();
	});
});

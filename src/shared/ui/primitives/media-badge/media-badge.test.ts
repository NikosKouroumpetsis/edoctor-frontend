import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MediaBadge from './media-badge.svelte';

describe('MediaBadge', () => {
	it('U-03.1: pins a one-line card label to the photo’s top-left corner (M-03, article)', () => {
		const { container } = render(MediaBadge, { props: { label: 'Οδηγός' } });
		const badge = container.querySelector('[data-slot="media-badge"]') as HTMLElement;
		expect(badge).toHaveClass(
			'absolute',
			'top-3',
			'left-3',
			'rounded-md',
			'bg-card',
			'px-3',
			'py-1.5',
			'shadow-raised'
		);
		expect(badge).not.toHaveClass('w-badge-w');
		expect(screen.getByText('Οδηγός')).toHaveClass(
			'text-label-md',
			'font-bold',
			'text-foreground',
			'line-clamp-1'
		);
	});

	// U-06.3 turns the fixed `w-badge-w` this test pinned into a minimum: the owner saw «Επιλογή της κοινότητας» cut.
	it('U-06.3: the badge width is a minimum that grows to the photo less its insets, two lines, same text size', () => {
		const { container } = render(MediaBadge, {
			props: { label: 'Επιλογή της κοινότητας', maxLines: 2, width: 'badge' }
		});
		const badge = container.querySelector('[data-slot="media-badge"]') as HTMLElement;
		expect(badge).toHaveClass('min-w-badge-w', 'w-fit', 'left-3', 'right-3');
		expect(badge).not.toHaveClass('w-badge-w');
		expect(badge).toHaveAttribute('title', 'Επιλογή της κοινότητας');
		expect(screen.getByText('Επιλογή της κοινότητας')).toHaveClass('line-clamp-2', 'text-label-md');
	});

	it('U-06.3: an auto badge hugs its words, never stretched between the insets', () => {
		const { container } = render(MediaBadge, { props: { label: 'Νέο' } });
		const badge = container.querySelector('[data-slot="media-badge"]') as HTMLElement;
		expect(badge).not.toHaveClass('right-3');
		expect(badge).not.toHaveClass('min-w-badge-w');
		expect(badge).toHaveAttribute('title', 'Νέο');
	});

	it('U-06.3: beside the photo’s action the badge stops a touch box short of the end (the application’s besideAction)', () => {
		const { container } = render(MediaBadge, {
			props: { label: 'Επιλογή της κοινότητας', maxLines: 2, width: 'badge', besideAction: true }
		});
		const badge = container.querySelector('[data-slot="media-badge"]') as HTMLElement;
		expect(badge).toHaveClass('right-touch', 'min-w-badge-w', 'w-fit');
		expect(badge).not.toHaveClass('right-3');
	});
});

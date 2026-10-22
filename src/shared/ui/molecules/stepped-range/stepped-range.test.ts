import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SteppedRange from './stepped-range.svelte';

const steps = ['30 min', '1 h', '1.5 h', '2 h', '3 h', '4 h', '5+ h'];

describe('SteppedRange', () => {
	it('renders the title and one label per stop', () => {
		render(SteppedRange, {
			props: { title: 'Duration', steps, value: [0, 6] as [number, number] }
		});

		expect(screen.getByText('Duration')).toBeInTheDocument();
		for (const label of steps) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
	});

	it('exposes two thumbs bound to the discrete index domain', () => {
		render(SteppedRange, { props: { steps, value: [0, 6] as [number, number] } });

		const thumbs = screen.getAllByRole('slider');
		expect(thumbs).toHaveLength(2);
		expect(thumbs[0]).toHaveAttribute('aria-valuemin', '0');
		expect(thumbs[0]).toHaveAttribute('aria-valuemax', '6');
		expect(thumbs[0]).toHaveAttribute('aria-valuenow', '0');
		expect(thumbs[1]).toHaveAttribute('aria-valuenow', '6');
	});

	it('emphasises exactly the two selected-endpoint labels', () => {
		const { rerender } = render(SteppedRange, {
			props: { steps, value: [0, 6] as [number, number] }
		});

		// Endpoints of [0, 6] are the first and last labels.
		expect(screen.getByText('30 min').className).toContain('text-foreground');
		expect(screen.getByText('5+ h').className).toContain('text-foreground');
		// An interior stop stays muted.
		expect(screen.getByText('2 h').className).toContain('text-muted-foreground');

		// Moving the range shifts the emphasis to the new endpoints.
		rerender({ steps, value: [0, 1] as [number, number] });
		expect(screen.getByText('1 h').className).toContain('text-foreground');
		expect(screen.getByText('5+ h').className).toContain('text-muted-foreground');
	});

	it('renders a tick for every non-selected interior stop', () => {
		// [0, 6] leaves stops 1..5 (5 ticks); endpoints 0 and 6 carry thumbs.
		const { container } = render(SteppedRange, {
			props: { steps, value: [0, 6] as [number, number] }
		});
		expect(container.querySelectorAll('[data-slot="stepped-range-tick"]')).toHaveLength(5);
	});

	it('moves an index with the arrow keys and prevents the thumbs from crossing', async () => {
		const user = userEvent.setup({ delay: null });
		render(SteppedRange, { props: { steps, value: [2, 3] as [number, number] } });

		const thumbs = screen.getAllByRole('slider');

		// Arrow steps the lower thumb by one index.
		thumbs[0].focus();
		await user.keyboard('{ArrowRight}');
		expect(thumbs[0]).toHaveAttribute('aria-valuenow', '3');

		// The upper thumb cannot cross below the lower thumb (now at 3).
		thumbs[1].focus();
		await user.keyboard('{ArrowLeft}');
		await user.keyboard('{ArrowLeft}');
		expect(thumbs[1]).toHaveAttribute('aria-valuenow', '3');
	});

	// 🔴 S-26.9: each thumb says the label of its stop, not the stop's index.
	it('S-26.9: slider announces its shown value, never a percentage', () => {
		render(SteppedRange, { props: { steps, value: [0, 6] as [number, number] } });

		expect(
			screen.getAllByRole('slider').map((thumb) => thumb.getAttribute('aria-valuetext'))
		).toEqual(['30 min', '5+ h']);
	});
});

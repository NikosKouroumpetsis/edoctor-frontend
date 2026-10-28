import { afterEach, describe, expect, it, vi } from 'vitest';
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

	describe('step labels without overlap (U-06.10)', () => {
		const six = ['A0', 'B1', 'C2', 'D3', 'E4', 'F5'];
		const widths: Record<string, number> = { A0: 62, B1: 44, C2: 52, D3: 56, E4: 58, F5: 64 };

		/** jsdom draws no box: the labels row is 300 wide (fixture 1) and each label its width. */
		function measure(merged = 120) {
			vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
				this: HTMLElement
			) {
				const slot = this.dataset.slot;
				if (slot === 'stepped-range-labels') return 300;
				if (slot === 'stepped-range-merged-label') return merged;
				if (slot === 'stepped-range-label') return widths[this.textContent?.trim() ?? ''] ?? 0;
				return 0;
			});
		}
		const label = (text: string) =>
			screen.getByText(text, { selector: '[data-slot="stepped-range-label"]' });

		afterEach(() => vi.restoreAllMocks());

		it('U-06.10: until measured, no label shows (no overlap for an instant)', () => {
			render(SteppedRange, { props: { steps: six, value: [0, 1] as [number, number] } });
			for (const text of six) expect(label(text)).toHaveClass('invisible');
		});

		it('U-06.10: fixture 1 on the component — 0, 1 (moved), 5, 3 shown at their x; 2 and 4 hidden', () => {
			measure();
			render(SteppedRange, { props: { steps: six, value: [0, 1] as [number, number] } });
			const at = (text: string) => label(text).style.transform;
			expect(at('A0')).toBe('translateX(0px)');
			expect(at('B1')).toBe('translateX(70px)');
			expect(at('F5')).toBe('translateX(236px)');
			expect(at('D3')).toBe('translateX(152px)');
			for (const text of ['A0', 'B1', 'D3', 'F5']) expect(label(text)).not.toHaveClass('invisible');
			for (const text of ['C2', 'E4']) expect(label(text)).toHaveClass('invisible');
			expect(document.querySelector('[data-slot="stepped-range-merged-label"]')).toHaveClass(
				'invisible'
			);
		});

		it('U-06.10: when the second chosen label cannot fit, ONE «A – B» label shows in their place', () => {
			widths.B1 = 260;
			try {
				measure(110);
				render(SteppedRange, { props: { steps: six, value: [0, 1] as [number, number] } });
				const merged = document.querySelector(
					'[data-slot="stepped-range-merged-label"]'
				) as HTMLElement;
				expect(merged).toHaveTextContent('A0 – B1');
				expect(merged).not.toHaveClass('invisible');
				expect(label('A0')).toHaveClass('invisible');
				expect(label('B1')).toHaveClass('invisible');
			} finally {
				widths.B1 = 44;
			}
		});

		// U-06.2: the labels and the ticks sit on the slider's rail, inset by half the 48 touch box.
		it('U-06.2: the labels row and the ticks are inset by half the touch box, as the rail', () => {
			const { container } = render(SteppedRange, {
				props: { steps: six, value: [0, 5] as [number, number] }
			});
			expect(container.querySelector('[data-slot="stepped-range-labels"]')).toHaveClass('mx-6');
			expect(
				container.querySelector('[data-slot="stepped-range-tick"]')?.parentElement
			).toHaveClass('inset-x-6');
			expect(container.querySelector('[data-slot="slider-rail"]')).toHaveClass('mx-6');
		});
	});
});

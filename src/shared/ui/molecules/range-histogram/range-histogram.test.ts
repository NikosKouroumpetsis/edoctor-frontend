import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import RangeHistogram from './range-histogram.svelte';

const distribution = [0.3, 0.6, 1, 0.8, 0.5, 0.4, 0.3, 0.2, 0.15, 0.1];
/** The caller's format (the screen's): «80 €», «420+ €» at the ceiling. */
const euros = (value: number, atCeiling: boolean) => `${value}${atCeiling ? '+' : ''} €`;
const base = { minLabel: 'Ελάχιστη', maxLabel: 'Μέγιστη', formatValue: euros };

describe('RangeHistogram', () => {
	it('renders the title, subtitle and both field labels', () => {
		render(RangeHistogram, {
			props: {
				...base,
				title: 'Τιμή',
				subtitle: 'Χωρίς προμήθειες',
				data: distribution,
				value: [10, 90] as [number, number]
			}
		});
		expect(screen.getByText('Τιμή')).toHaveClass(
			'font-semibold',
			'text-foreground',
			'text-title-sm'
		);
		expect(screen.getByText('Χωρίς προμήθειες')).toHaveClass(
			'text-muted-foreground',
			'text-body-sm'
		);
		expect(screen.getByLabelText('Ελάχιστη')).toBeInTheDocument();
		expect(screen.getByLabelText('Μέγιστη')).toBeInTheDocument();
	});

	// 🔴 U-03.11: the value's words are the caller's; the kit holds no currency.
	it('U-03.11: the pills and the thumbs say the caller’s format, with the ceiling flag on the max', () => {
		const formatValue = vi.fn(euros);
		const ceiling = render(RangeHistogram, {
			props: {
				...base,
				formatValue,
				data: distribution,
				min: 8,
				max: 420,
				value: [80, 420] as [number, number]
			}
		});
		expect(ceiling.getByLabelText('Ελάχιστη')).toHaveValue('80 €');
		expect(ceiling.getByLabelText('Μέγιστη')).toHaveValue('420+ €');
		expect(
			screen.getAllByRole('slider').map((thumb) => thumb.getAttribute('aria-valuetext'))
		).toEqual(['80 €', '420+ €']);
		expect(formatValue).toHaveBeenCalledWith(420, true);
		ceiling.unmount();
		render(RangeHistogram, {
			props: { ...base, data: distribution, min: 8, max: 420, value: [8, 300] as [number, number] }
		});
		expect(screen.getByLabelText('Μέγιστη')).toHaveValue('300 €');
	});

	it('S-26.9: the slider says the shown value, never a percentage', () => {
		render(RangeHistogram, {
			props: {
				...base,
				formatValue: (value: number, atCeiling: boolean) => `€${value}${atCeiling ? '+' : ''}`,
				data: distribution,
				min: 8,
				max: 420,
				value: [80, 420] as [number, number]
			}
		});
		expect(
			screen.getAllByRole('slider').map((thumb) => thumb.getAttribute('aria-valuetext'))
		).toEqual(['€80', '€420+']);
	});

	it('U-03.1 (K4.x): the bars — 4 of 10 in the accent inside [20, 60], the rest muted 25 %, rounded xs on top', () => {
		const { container } = render(RangeHistogram, {
			props: { ...base, data: distribution, min: 0, max: 100, value: [20, 60] as [number, number] }
		});
		const bars = container.querySelectorAll('[data-slot="range-histogram-bar"]');
		const active = container.querySelectorAll('[data-slot="range-histogram-bar"][data-active]');
		expect(bars).toHaveLength(10);
		expect(active).toHaveLength(4);
		expect(active[0]).toHaveClass('flex-1', 'rounded-t-xs', 'bg-accent');
		expect(bars[0]).toHaveClass('bg-muted-foreground/25');
		// U-06.2: the bars sit on the slider's rail (inset by half the 48 touch box), not on the whole chart.
		expect(bars[0].parentElement).toHaveClass(
			'absolute',
			'inset-x-6',
			'inset-y-0',
			'flex-row',
			'items-end',
			'gap-1'
		);
	});

	// U-06.2 drops the chart's half-thumb inset this test pinned (`px-3` / `px-4`): a thumb's 48 touch box overflowed
	// the box by 12; the slider's own rail now holds the thumbs inside (half the touch box, the bars on it).
	it('U-03.1 (K4.x): the application’s sizes — chart 112, thumbs 24, fields 144, pills 48 / 56', () => {
		const sizes = [
			{
				size: 'sm',
				histogram: 'h-histogram-sm',
				field: 'w-range-field-sm',
				thumb: 'size-6',
				pill: ['min-h-control-md', 'px-4']
			},
			{
				size: 'default',
				histogram: 'h-histogram-md',
				field: 'w-range-field-md',
				thumb: 'size-6',
				pill: ['min-h-control-md', 'px-5']
			},
			{
				size: 'lg',
				histogram: 'h-histogram-lg',
				field: 'w-range-field-lg',
				thumb: 'size-control-xs',
				pill: ['min-h-control-lg', 'px-6', 'text-title-sm']
			}
		] as const;
		for (const spec of sizes) {
			const view = render(RangeHistogram, {
				props: { ...base, size: spec.size, data: distribution, value: [20, 80] as [number, number] }
			});
			const root = view.container;
			// NIT-5 (R1 review): the inset's wrapper went with its padding; the chart is the root's own child.
			expect(root.querySelector('[data-slot="range-histogram-inset"]')).toBeNull();
			expect(
				root.querySelector('[data-slot="range-histogram-chart"]')?.parentElement
			).toHaveAttribute('data-slot', 'range-histogram');
			expect(root.querySelector('[data-slot="range-histogram-chart"]')).toHaveClass(
				'relative',
				spec.histogram
			);
			const pill = view.getByLabelText('Ελάχιστη');
			expect(pill).toHaveClass(
				'w-full',
				'rounded-full',
				'border',
				'border-input',
				'bg-card',
				'font-medium',
				'text-foreground',
				...spec.pill
			);
			expect(pill.parentElement).toHaveClass('flex', 'flex-col', 'gap-2', spec.field);
			expect(view.getAllByRole('slider')[0].firstElementChild).toHaveClass(
				'border-input',
				'bg-card',
				'shadow-overlay',
				spec.thumb
			);
			view.unmount();
		}
	});

	it('U-03.1 (negative): without data — no bars and no reserved height; the slider sits in the flow', () => {
		const { container } = render(RangeHistogram, {
			props: { ...base, value: [20, 80] as [number, number] }
		});
		expect(container.querySelectorAll('[data-slot="range-histogram-bar"]')).toHaveLength(0);
		const chart = container.querySelector('[data-slot="range-histogram-chart"]') as HTMLElement;
		expect(chart.className).not.toMatch(/h-histogram/);
		expect(container.querySelector('[data-slot="range-histogram-slider"]')).not.toHaveClass(
			'absolute'
		);
	});

	it('renders no stepper buttons', () => {
		render(RangeHistogram, {
			props: { ...base, data: distribution, value: [20, 80] as [number, number] }
		});
		expect(screen.queryAllByRole('button')).toHaveLength(0);
	});

	it('rejects non-numeric characters while typing', async () => {
		const user = userEvent.setup({ delay: null });
		render(RangeHistogram, {
			props: { ...base, data: distribution, value: [20, 80] as [number, number] }
		});
		const minInput = screen.getByLabelText('Ελάχιστη');
		await user.clear(minInput);
		await user.type(minInput, '1a2b3');
		expect(minInput).toHaveValue('123');
	});

	it('commits a typed value to the range and `onChange`, clamping and preventing crossing', async () => {
		const user = userEvent.setup({ delay: null });
		const onChange = vi.fn();
		render(RangeHistogram, {
			props: {
				...base,
				onChange,
				data: distribution,
				min: 0,
				max: 100,
				value: [20, 80] as [number, number]
			}
		});
		const minInput = screen.getByLabelText('Ελάχιστη');
		const thumbs = screen.getAllByRole('slider');
		await user.clear(minInput);
		await user.type(minInput, '50{Enter}');
		expect(thumbs[0]).toHaveAttribute('aria-valuenow', '50');
		expect(onChange).toHaveBeenLastCalledWith([50, 80]);
		await user.clear(minInput);
		await user.type(minInput, '90{Enter}');
		expect(thumbs[0]).toHaveAttribute('aria-valuenow', '80');
		expect(onChange).toHaveBeenLastCalledWith([80, 80]);
	});

	it('U-02.1 (light/dark): the selection in the brand accent, the thumbs and pills from tokens, no raw colour', () => {
		const { container } = render(RangeHistogram, {
			props: { ...base, data: distribution, min: 0, max: 100, value: [20, 60] as [number, number] }
		});
		expect(container.innerHTML).not.toMatch(
			/\bdark:|#[0-9a-f]{3,8}\b|bg-white|neutral-300|shadow-(md|lg)\b/i
		);
	});
});

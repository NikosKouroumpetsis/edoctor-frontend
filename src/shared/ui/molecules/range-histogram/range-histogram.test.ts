import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import RangeHistogram from './range-histogram.svelte';

const distribution = [0.3, 0.6, 1, 0.8, 0.5, 0.4, 0.3, 0.2, 0.15, 0.1];

describe('RangeHistogram', () => {
	it('renders the title, subtitle and both field labels', () => {
		render(RangeHistogram, {
			props: {
				title: 'Price per guest',
				subtitle: 'Fees and taxes excluded',
				minLabel: 'Lowest',
				maxLabel: 'Highest',
				data: distribution,
				min: 0,
				max: 100,
				value: [10, 90] as [number, number]
			}
		});

		expect(screen.getByText('Price per guest')).toBeInTheDocument();
		expect(screen.getByText('Fees and taxes excluded')).toBeInTheDocument();
		expect(screen.getByLabelText('Lowest')).toBeInTheDocument();
		expect(screen.getByLabelText('Highest')).toBeInTheDocument();
	});

	it('formats the resting values with the currency prefix and a ceiling "+"', () => {
		const ceiling = render(RangeHistogram, {
			props: {
				minLabel: 'Min',
				maxLabel: 'Max',
				data: distribution,
				min: 8,
				max: 420,
				value: [8, 420] as [number, number]
			}
		});
		expect(ceiling.getByLabelText('Min')).toHaveValue('€8');
		expect(ceiling.getByLabelText('Max')).toHaveValue('€420+');
		ceiling.unmount();

		const belowCeiling = render(RangeHistogram, {
			props: {
				minLabel: 'Min',
				maxLabel: 'Max',
				data: distribution,
				min: 8,
				max: 420,
				value: [8, 300] as [number, number]
			}
		});
		// No "+" when the max is below the ceiling.
		expect(belowCeiling.getByLabelText('Max')).toHaveValue('€300');
	});

	it('highlights exactly the bars whose bucket falls inside the range', () => {
		// 10 buckets over [0,100] → centres 5,15,…,95. Range [20,60] covers
		// 25/35/45/55 → 4 active bars.
		const { container } = render(RangeHistogram, {
			props: {
				data: distribution,
				min: 0,
				max: 100,
				value: [20, 60] as [number, number]
			}
		});

		const active = container.querySelectorAll('[data-slot="range-histogram-bar"][data-active]');
		expect(active).toHaveLength(4);
	});

	it('renders no stepper buttons', () => {
		render(RangeHistogram, {
			props: {
				data: distribution,
				min: 0,
				max: 100,
				value: [20, 80] as [number, number]
			}
		});
		expect(screen.queryAllByRole('button')).toHaveLength(0);
	});

	it('rejects non-numeric characters while typing', async () => {
		const user = userEvent.setup({ delay: null });
		render(RangeHistogram, {
			props: {
				minLabel: 'Min',
				maxLabel: 'Max',
				data: distribution,
				min: 0,
				max: 100,
				value: [20, 80] as [number, number]
			}
		});

		const minInput = screen.getByLabelText('Min');
		await user.clear(minInput);
		await user.type(minInput, '1a2b3');
		expect(minInput).toHaveValue('123');
	});

	it('commits a typed value to the range, clamping and preventing crossing', async () => {
		const user = userEvent.setup({ delay: null });
		render(RangeHistogram, {
			props: {
				minLabel: 'Min',
				maxLabel: 'Max',
				data: distribution,
				min: 0,
				max: 100,
				value: [20, 80] as [number, number]
			}
		});

		const minInput = screen.getByLabelText('Min');
		const thumbs = screen.getAllByRole('slider');

		// Typing and pressing Enter moves the lower handle.
		await user.clear(minInput);
		await user.type(minInput, '50{Enter}');
		expect(thumbs[0]).toHaveAttribute('aria-valuenow', '50');

		// The min cannot cross the max (80): it clamps at 80.
		await user.clear(minInput);
		await user.type(minInput, '90{Enter}');
		expect(Number(thumbs[0].getAttribute('aria-valuenow'))).toBeLessThanOrEqual(80);
		expect(thumbs[0]).toHaveAttribute('aria-valuenow', '80');
	});
});

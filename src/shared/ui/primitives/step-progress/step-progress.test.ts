import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StepProgress from './step-progress.svelte';

const segments = (container: HTMLElement) =>
	[...container.querySelectorAll('[data-slot="step-progress-segment"]')] as HTMLElement[];
const fills = (container: HTMLElement) =>
	[...container.querySelectorAll('[data-slot="step-progress-fill"]')].map(
		(fill) => (fill as HTMLElement).style.width
	);

describe('StepProgress', () => {
	it('U-06.8: done segments full, the current one by `progress`, the rest empty; read as one progressbar', () => {
		const { container } = render(StepProgress, {
			props: { steps: 3, currentStep: 1, progress: 0.6, 'aria-label': 'Πρόοδος' }
		});
		const bar = screen.getByRole('progressbar', { name: 'Πρόοδος' });
		expect(bar).toHaveAttribute('aria-valuemin', '0');
		expect(bar).toHaveAttribute('aria-valuemax', '3');
		expect(bar).toHaveAttribute('aria-valuenow', '1.6');
		expect(bar).toHaveClass('flex', 'w-full', 'items-center', 'gap-1.5');
		expect(fills(container)).toEqual(['100%', '60%', '0%']);
		expect(segments(container)[0]).toHaveClass(
			'flex-1',
			'overflow-hidden',
			'rounded-full',
			'bg-muted'
		);
	});

	it('U-06.8: progress is clamped to 0..1 (NaN is 0) and the value never passes the steps', () => {
		const over = render(StepProgress, { props: { steps: 2, currentStep: 1, progress: 4 } });
		expect(fills(over.container)).toEqual(['100%', '100%']);
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
		over.unmount();
		const nan = render(StepProgress, { props: { steps: 2, currentStep: 0, progress: Number.NaN } });
		expect(fills(nan.container)).toEqual(['0%', '0%']);
	});

	// U-06.9: the thickness is a step of the scale, never `[Npx]`; `md` is the application's `h-1`.
	it('U-06.9: md (h-1) by default, sm h-0.5, lg h-1.5', () => {
		const md = render(StepProgress, { props: { steps: 3, currentStep: 0 } });
		for (const segment of segments(md.container)) expect(segment).toHaveClass('h-1');
		md.unmount();
		for (const [thickness, step] of [
			['sm', 'h-0.5'],
			['lg', 'h-1.5']
		] as const) {
			const view = render(StepProgress, { props: { steps: 3, currentStep: 0, thickness } });
			for (const segment of segments(view.container)) {
				expect(segment).toHaveClass(step);
				expect(segment.className).not.toMatch(/\[/);
			}
			view.unmount();
		}
	});
});

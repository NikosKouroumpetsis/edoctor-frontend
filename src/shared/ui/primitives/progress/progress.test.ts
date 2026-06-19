import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Progress from './progress.svelte';

describe('Progress', () => {
	it('exposes the current value through ARIA', () => {
		render(Progress, { props: { value: 40 } });
		const bar = screen.getByRole('progressbar');
		expect(bar).toHaveAttribute('aria-valuenow', '40');
		expect(bar).toHaveAttribute('aria-valuemax', '100');
		expect(bar).toHaveAttribute('data-state', 'loading');
	});

	it('clamps out-of-range values and marks completion', () => {
		render(Progress, { props: { value: 150 } });
		const bar = screen.getByRole('progressbar');
		expect(bar).toHaveAttribute('aria-valuenow', '100');
		expect(bar).toHaveAttribute('data-state', 'complete');
	});

	it('marks an indeterminate state when value is null', () => {
		render(Progress, { props: { value: null } });
		expect(screen.getByRole('progressbar')).toHaveAttribute('data-state', 'indeterminate');
	});
});

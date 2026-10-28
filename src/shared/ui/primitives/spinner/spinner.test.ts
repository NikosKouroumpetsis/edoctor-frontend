import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Spinner from './spinner.svelte';

describe('Spinner', () => {
	it('U-03.1: is decorative without a label and a named progress bar with one', () => {
		const quiet = render(Spinner);
		const node = quiet.container.querySelector('[data-slot="spinner"]') as HTMLElement;
		expect(node).toHaveAttribute('aria-hidden', 'true');
		expect(screen.queryByRole('progressbar')).toBeNull();
		quiet.unmount();
		render(Spinner, { props: { label: 'Φόρτωση' } });
		expect(screen.getByRole('progressbar', { name: 'Φόρτωση' })).toBeInTheDocument();
	});

	it('U-03.1: draws eight spokes turning in steps, in the tone colour and the size', () => {
		const { container } = render(Spinner, { props: { tone: 'primary-foreground', size: 'lg' } });
		const node = container.querySelector('[data-slot="spinner"]') as HTMLElement;
		expect(node).toHaveClass('text-primary-foreground');
		expect(node.querySelectorAll('line')).toHaveLength(8);
		expect(node.querySelector('svg')).toHaveClass('animate-spinner', 'icon-xl');
	});

	it('U-03.1: sm and md are the 20 icon of the native small indicator', () => {
		for (const size of ['sm', 'md'] as const) {
			const view = render(Spinner, { props: { size } });
			expect(view.container.querySelector('svg')).toHaveClass('icon-md');
			view.unmount();
		}
	});
});

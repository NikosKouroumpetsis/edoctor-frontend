import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Skeleton from './skeleton.svelte';

describe('Skeleton', () => {
	it('U-03.1: is the application placeholder: muted 95 %, rounded-lg, breathing, decorative', () => {
		const { container } = render(Skeleton, { props: { class: 'h-4 w-1/2' } });
		const node = container.querySelector('[data-slot="skeleton"]') as HTMLElement;
		expect(node).toHaveClass('animate-skeleton', 'rounded-lg', 'bg-muted/95', 'h-4', 'w-1/2');
		// U-12.1: it breathes whatever the motion setting (R2's `motion-reduce:animate-none` is gone).
		expect(node).not.toHaveClass('motion-reduce:animate-none');
		expect(node).toHaveAttribute('aria-hidden', 'true');
	});
});

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Card from './card.svelte';

describe('Card', () => {
	it('renders the card root slot', () => {
		const { container } = render(Card);
		expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
	});

	it('defaults the root padding to py-6 and scales with the size prop', () => {
		const def = render(Card);
		expect(def.container.querySelector('[data-slot="card"]')).toHaveClass('py-6', 'gap-6');
		def.unmount();

		const sm = render(Card, { props: { size: 'sm' } });
		expect(sm.container.querySelector('[data-slot="card"]')).toHaveClass('py-4', 'gap-4');
		sm.unmount();

		const lg = render(Card, { props: { size: 'lg' } });
		expect(lg.container.querySelector('[data-slot="card"]')).toHaveClass('py-8', 'gap-8');
	});
});

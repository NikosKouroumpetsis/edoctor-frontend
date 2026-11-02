import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './photo-add-more.harness.svelte';

// U-31.1 (the owner, 29/10, f2's open point): «Προσθήκη περισσοτέρων» showed nothing when the keyboard reached it
// (`outline-none` without a ring); it now draws the kit's ring, on the tile's corner, from the keyboard only.
describe('PhotoAddMore · the keyboard’s focus (U-31.1)', () => {
	it('U-31.1: the keyboard’s focus is the kit’s ring (`focus-visible:ring-3 ring-ring/50`) on the tile’s corner', async () => {
		render(Harness);
		const button = screen.getByRole('button', { name: 'Προσθήκη περισσοτέρων' });
		expect(button).toHaveClass(
			'outline-none',
			'rounded-xl',
			'focus-visible:ring-3',
			'focus-visible:ring-ring/50'
		);
		await userEvent.setup().tab();
		expect(button).toHaveFocus();
	});

	it('U-31.1 (negative): no ring at rest or under a pointer — the ring is only `focus-visible`’s, the tile’s look stays', () => {
		render(Harness);
		const button = screen.getByRole('button', { name: 'Προσθήκη περισσοτέρων' });
		const classes = [...button.classList];
		expect(classes.filter((name) => /^ring-|^focus:ring/u.test(name))).toEqual([]);
		const tile = button.querySelector('.border-dashed') as HTMLElement;
		expect(tile).toHaveClass(
			'rounded-xl',
			'border',
			'border-dashed',
			'border-border',
			'bg-muted/20'
		);
	});
});

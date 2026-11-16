import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import RoundLink from './round-link.svelte';

describe('RoundLink (the round «←» / «‹» / «×» at the top of a screen; shared since D-W51-50)', () => {
	it('a link named by the caller, the 40 chip circle inside the 48 target, its press reaches the caller', async () => {
		const onclick = vi.fn((event: MouseEvent) => event.preventDefault());
		render(RoundLink, {
			props: { href: '/x', label: 'Πίσω', icon: 'chevron-back', onclick, testId: 'back' }
		});
		const link = screen.getByRole('link', { name: 'Πίσω' });
		expect(link).toBe(screen.getByTestId('back'));
		expect(link).toHaveAttribute('href', '/x');
		expect(link).toHaveAttribute('data-slot', 'round-link');
		expect(link.className).toContain('size-touch');
		expect(link.firstElementChild?.className).toContain('size-control-sm');
		expect(link.firstElementChild?.className).toContain('bg-foreground/5');
		await fireEvent.click(link);
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it('another name and glyph from 744: one hidden name per width', () => {
		render(RoundLink, {
			props: {
				href: '/x',
				label: 'Κλείσιμο',
				wideLabel: 'Πίσω',
				icon: 'close',
				wideIcon: 'arrow-back'
			}
		});
		const names = [...document.querySelectorAll('[data-slot="round-link-name"]')];
		expect(names.map((name) => name.textContent)).toEqual(['Κλείσιμο', 'Πίσω']);
		expect(screen.getByRole('link')).not.toHaveAttribute('aria-label');
	});

	it('(U-100) no colour under the pointer', () => {
		render(RoundLink, { props: { href: '/x', label: 'Πίσω', icon: 'arrow-back' } });
		expect(screen.getByRole('link').outerHTML).not.toMatch(/hover:/u);
	});
});

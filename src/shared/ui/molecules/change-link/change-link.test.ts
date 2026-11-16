import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import ChangeLink from './change-link.svelte';

describe('ChangeLink (U-102: a change is a link to a new screen; shared since D-W51-37)', () => {
	it('a link with the caller’s words, its step named on it, the chip’s fill, a 48 target', () => {
		render(ChangeLink, {
			props: { label: 'Αλλαγή', ariaLabel: 'Αλλαγή: Ημέρα και ώρα', step: 'time', href: '/x/time' }
		});
		const link = screen.getByRole('link', { name: 'Αλλαγή: Ημέρα και ώρα' });
		expect(link).toHaveAttribute('href', '/x/time');
		expect(link).toHaveAttribute('data-slot', 'change-link');
		expect(link).toHaveAttribute('data-step', 'time');
		expect(link.className).toContain('min-h-touch');
		expect(link.firstElementChild?.className).toContain('bg-chip');
		expect(link).toHaveTextContent('Αλλαγή');
	});

	it('dark when it is the way out; a plain press reaches the caller', async () => {
		const onOpen = vi.fn((event: MouseEvent) => event.preventDefault());
		render(ChangeLink, {
			props: { label: 'Προσθήκη', ariaLabel: 'Προσθήκη', emphasis: true, href: '/x', onOpen }
		});
		const link = screen.getByRole('link', { name: 'Προσθήκη' });
		expect(link).toHaveAttribute('data-emphasis');
		expect(link.firstElementChild?.className).toContain('bg-foreground');
		await fireEvent.click(link);
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it('(negative, U-65.6) words are text, never HTML', () => {
		render(ChangeLink, { props: { label: '<b>x</b>', ariaLabel: 'x', href: '/x' } });
		expect(screen.getByRole('link').querySelector('b')).toBeNull();
	});
});

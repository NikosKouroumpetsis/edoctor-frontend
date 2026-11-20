import { describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import LinkCard from './link-card.svelte';

describe('LinkCard (screen 84, the row of 68)', () => {
	it('a framed link: the glyph, the small word over the strong line, «›»; every word a text node (U-65.6)', () => {
		render(LinkCard, {
			props: {
				href: '/x',
				icon: 'calendar-outline',
				label: 'Το ραντεβού',
				title: '<b>Τετάρτη</b> 11 Νοεμβρίου, 10:00',
				testId: 'card'
			}
		});
		const link = screen.getByTestId('card');
		expect(link.tagName).toBe('A');
		expect(link).toHaveAttribute('href', '/x');
		expect(link).toHaveTextContent('Το ραντεβού <b>Τετάρτη</b> 11 Νοεμβρίου, 10:00');
		expect(link.querySelector('b')).toBeNull();
		expect(link.querySelectorAll('svg')).toHaveLength(2);
		expect(link.className).toContain('min-h-touch');
		// U-100: no colour under the pointer.
		expect(link.className).not.toMatch(/hover:(bg|text|border)-/u);
	});

	it('a strong line the caller draws, the link named aloud, and its press the caller’s', async () => {
		const onclick = vi.fn((event: MouseEvent) => event.preventDefault());
		render(LinkCard, {
			props: {
				href: '/y',
				icon: 'star-outline',
				label: 'Η κριτική του ασθενή',
				name: 'Η κριτική του ασθενή: 5 από 5 αστέρια',
				body: createRawSnippet(() => ({ render: () => '<span data-testid="body">★★★★★</span>' })),
				onclick
			}
		});
		const link = screen.getByRole('link', { name: 'Η κριτική του ασθενή: 5 από 5 αστέρια' });
		expect(screen.getByTestId('body')).toBeInTheDocument();
		await userEvent.click(link);
		expect(onclick).toHaveBeenCalledTimes(1);
	});
});

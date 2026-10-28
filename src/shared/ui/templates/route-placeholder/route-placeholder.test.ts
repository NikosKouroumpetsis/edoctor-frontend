import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import RoutePlaceholder from './route-placeholder.svelte';

describe('RoutePlaceholder', () => {
	it('U-03.8: writes the caller’s words and leads back to the caller’s href', () => {
		render(RoutePlaceholder, {
			props: {
				eyebrow: 'Σύντομα',
				title: 'Κατάλογος',
				body: 'Η σελίδα ετοιμάζεται.',
				backHref: '/en',
				backLabel: 'Back home',
				documentTitle: 'Κατάλογος | Δείγμα'
			}
		});
		expect(screen.getByRole('main')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 1, name: 'Κατάλογος' })).toBeInTheDocument();
		expect(screen.getByText('Σύντομα')).toHaveClass('text-primary-text');
		expect(screen.getByRole('link', { name: 'Back home' })).toHaveAttribute('href', '/en');
		expect(document.title).toBe('Κατάλογος | Δείγμα');
	});
});

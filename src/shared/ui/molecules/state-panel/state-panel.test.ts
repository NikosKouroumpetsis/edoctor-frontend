import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { StatePanel } from './index';

describe('StatePanel (MINOR-5 of r1)', () => {
	it('U-57.2 / U-61.2: a failed list — the glyph, the title, its line and «Δοκιμάστε ξανά» that asks again', async () => {
		const user = userEvent.setup({ delay: null });
		const onAction = vi.fn();
		render(StatePanel, {
			props: {
				glyph: 'cloud-offline-outline',
				title: 'Δεν μπορέσαμε να φορτώσουμε τα άρθρα',
				description: 'Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.',
				actionLabel: 'Δοκιμάστε ξανά',
				onAction,
				testId: 'state'
			}
		});
		expect(screen.getByTestId('state')).toHaveAttribute('role', 'status');
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Δεν μπορέσαμε');
		await user.click(screen.getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		expect(onAction).toHaveBeenCalledTimes(1);
	});

	it('U-57.3: an empty search’s way out is a link; without words for it there is no button at all (negative)', () => {
		const { unmount } = render(StatePanel, {
			props: {
				glyph: 'search',
				title: 'Δεν βρέθηκαν',
				actionLabel: 'Καθαρισμός αναζήτησης',
				actionHref: '/articles'
			}
		});
		expect(screen.getByRole('link', { name: 'Καθαρισμός αναζήτησης' })).toHaveAttribute(
			'href',
			'/articles'
		);
		unmount();
		render(StatePanel, { props: { glyph: 'search', title: 'Δεν βρέθηκαν', onAction: vi.fn() } });
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});
});

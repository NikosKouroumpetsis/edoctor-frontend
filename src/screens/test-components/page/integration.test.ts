import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Page from './index.svelte';

/**
 * Integration coverage: exercise realistic component+primitive combinations the
 * way a user would on the gallery page, across multiple sections at once.
 */
describe('Component gallery — integration', () => {
	it('checkbox drives its bound label text (state round-trip)', async () => {
		const user = userEvent.setup({ delay: null });
		render(Page);
		const terms = screen.getByLabelText(/Accept terms/i);
		expect(terms).toHaveAttribute('aria-checked', 'false');
		await user.click(terms);
		expect(screen.getByText(/Accept terms \(yes\)/i)).toBeInTheDocument();
	});

	it('tabs swap the visible panel within the disclosure section', async () => {
		const user = userEvent.setup({ delay: null });
		render(Page);
		await user.click(screen.getByRole('tab', { name: 'Reviews' }));
		const panel = screen.getByRole('tabpanel');
		expect(panel).toHaveTextContent(/Reviews content/i);
	});

	it('radio group enforces single selection across items', async () => {
		const user = userEvent.setup({ delay: null });
		render(Page);
		const free = screen.getByLabelText('Free');
		const team = screen.getByLabelText('Team');
		await user.click(free);
		expect(free).toHaveAttribute('aria-checked', 'true');
		await user.click(team);
		expect(team).toHaveAttribute('aria-checked', 'true');
		expect(free).toHaveAttribute('aria-checked', 'false');
	});

	it('toggle-group (single) keeps one alignment active', async () => {
		const user = userEvent.setup({ delay: null });
		render(Page);
		const left = screen.getByRole('button', { name: 'Align left' });
		const right = screen.getByRole('button', { name: 'Align right' });
		await user.click(right);
		expect(right).toHaveAttribute('aria-pressed', 'true');
		expect(left).toHaveAttribute('aria-pressed', 'false');
	});

	it('renders a composed doctor card (card + avatar fallback + button)', () => {
		render(Page);
		const display = document.querySelector('[data-section="display"]')!;
		const scope = within(display as HTMLElement);
		expect(scope.getByText('Dr. Maria Alexiou')).toBeInTheDocument();
		expect(scope.getByRole('button', { name: 'Book appointment' })).toBeInTheDocument();
	});
});

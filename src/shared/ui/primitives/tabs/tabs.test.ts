import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './tabs.harness.svelte';

describe('Tabs', () => {
	it('shows only the active panel and wires ARIA relationships', () => {
		render(Harness, { props: { value: 'account' } });
		const accountTab = screen.getByRole('tab', { name: 'Account' });
		expect(accountTab).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Account panel');
		expect(accountTab).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
	});

	it('switches the panel on click', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { value: 'account' } });
		await user.click(screen.getByRole('tab', { name: 'Password' }));
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Password panel');
		expect(screen.getByRole('tab', { name: 'Password' })).toHaveAttribute('aria-selected', 'true');
	});

	it('navigates with arrow keys (automatic activation)', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { value: 'account' } });
		screen.getByRole('tab', { name: 'Account' }).focus();
		await user.keyboard('{ArrowRight}');
		expect(screen.getByRole('tab', { name: 'Password' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Password panel');
	});
});

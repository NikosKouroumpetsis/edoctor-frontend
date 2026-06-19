import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './dropdown-menu.harness.svelte';

describe('DropdownMenu', () => {
	it('opens a menu and activates an item, then closes', async () => {
		const user = userEvent.setup();
		const onProfile = vi.fn();
		render(Harness, { props: { onProfile } });
		const trigger = screen.getByRole('button', { name: 'Open menu' });

		await user.click(trigger);
		expect(screen.getByRole('menu')).toBeInTheDocument();
		await user.click(screen.getByRole('menuitem', { name: 'Profile' }));
		expect(onProfile).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
	});

	it('toggles a checkbox item without closing', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open menu' }));
		const checkbox = screen.getByRole('menuitemcheckbox', { name: 'Show grid' });
		expect(checkbox).toHaveAttribute('aria-checked', 'false');
		await user.click(checkbox);
		expect(screen.getByRole('menuitemcheckbox', { name: 'Show grid' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		// Menu remains open after toggling a checkbox item.
		expect(screen.getByRole('menu')).toBeInTheDocument();
	});

	it('closes on Escape', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open menu' }));
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
	});
});

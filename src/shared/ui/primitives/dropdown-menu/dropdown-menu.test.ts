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

	it('R7-4: an item’s `icon` is a 16 glyph before its words, in the item’s colour (danger when destructive)', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open menu' }));
		const settings = await screen.findByRole('menuitem', { name: 'Settings' });
		const glyph = settings.querySelector('[data-slot="dropdown-menu-item-icon"]');
		expect(glyph).toHaveAttribute('data-icon', 'settings-outline');
		expect(glyph).toHaveClass('icon-sm');
		expect(glyph).toHaveAttribute('aria-hidden', 'true');
		expect(settings.firstElementChild).toBe(glyph);
		const remove = screen.getByRole('menuitem', { name: 'Delete' });
		expect(remove).toHaveClass('data-[variant=destructive]:text-danger-text');
		expect(remove.querySelector('[data-icon="trash-outline"]')?.getAttribute('class')).not.toMatch(
			/text-/
		);
		expect(screen.getByRole('menuitem', { name: 'Profile' }).querySelector('svg')).toBeNull();
	});
});

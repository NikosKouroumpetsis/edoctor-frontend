import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Switch from './switch.svelte';

describe('Switch', () => {
	it('toggles via click and keyboard, reporting changes', async () => {
		const user = userEvent.setup();
		const onCheckedChange = vi.fn();
		render(Switch, { props: { 'aria-label': 'Notifications', onCheckedChange } });
		const sw = screen.getByRole('switch', { name: 'Notifications' });

		expect(sw).toHaveAttribute('aria-checked', 'false');
		await user.click(sw);
		expect(sw).toHaveAttribute('aria-checked', 'true');

		sw.focus();
		await user.keyboard(' ');
		expect(sw).toHaveAttribute('aria-checked', 'false');
		expect(onCheckedChange).toHaveBeenCalledTimes(2);
	});

	it('respects disabled', async () => {
		const user = userEvent.setup();
		const onCheckedChange = vi.fn();
		render(Switch, { props: { 'aria-label': 'X', disabled: true, onCheckedChange } });
		await user.click(screen.getByRole('switch', { name: 'X' }));
		expect(onCheckedChange).not.toHaveBeenCalled();
	});
});

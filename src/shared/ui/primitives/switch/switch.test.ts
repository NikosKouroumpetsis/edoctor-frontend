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

	it('shows the thumb check only when checked (default showCheck), without a layout shift', async () => {
		const user = userEvent.setup();
		const { container } = render(Switch, { props: { 'aria-label': 'Notifications' } });
		const sw = screen.getByRole('switch', { name: 'Notifications' });
		const thumbCheck = () => container.querySelector('[data-slot="switch-thumb"] svg');

		// Kept out of the DOM unless checked (never "always there"), and positioned
		// absolutely so mounting it cannot shift the inline-flex switch vertically.
		expect(thumbCheck()).toBeNull();

		await user.click(sw);
		expect(sw).toHaveAttribute('aria-checked', 'true');
		const svg = thumbCheck();
		expect(svg).not.toBeNull();
		expect(svg?.getAttribute('class')).toContain('absolute');

		await user.click(sw);
		expect(sw).toHaveAttribute('aria-checked', 'false');
		expect(thumbCheck()).toBeNull();
	});

	it('defaults the track/thumb to the default scale and applies sm/lg', () => {
		const def = render(Switch, { props: { 'aria-label': 'd' } });
		expect(screen.getByRole('switch', { name: 'd' })).toHaveClass('w-8');
		expect(def.container.querySelector('[data-slot="switch-thumb"]')).toHaveClass('size-4');
		def.unmount();

		const sm = render(Switch, { props: { 'aria-label': 's', size: 'sm' } });
		expect(screen.getByRole('switch', { name: 's' })).toHaveClass('w-6');
		expect(sm.container.querySelector('[data-slot="switch-thumb"]')).toHaveClass('size-3');
		sm.unmount();

		const lg = render(Switch, { props: { 'aria-label': 'l', size: 'lg' } });
		expect(screen.getByRole('switch', { name: 'l' })).toHaveClass('w-10');
		expect(lg.container.querySelector('[data-slot="switch-thumb"]')).toHaveClass('size-5');
	});

	it('never renders the check when showCheck is false, even if checked', () => {
		const { container } = render(Switch, {
			props: { 'aria-label': 'Plain', checked: true, showCheck: false }
		});
		expect(container.querySelector('[data-slot="switch-thumb"] svg')).toBeNull();
	});
});

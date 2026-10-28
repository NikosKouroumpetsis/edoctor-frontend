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

	// U-07.1 (R4-6) replaces the web's own track this test pinned (`w-6 | w-control-xs | w-control-sm`, thumb
	// `size-3 | 4 | 5`) with the application's `switchGeometry`: 38×22 · 48×28 · 56×32, a 2 inset, `md` by default.
	it('U-07.1: draws the application’s track, thumb and travel per size, md by default, in the 48 box', async () => {
		const user = userEvent.setup();
		const part = (container: HTMLElement, slot: string) =>
			container.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
		const def = render(Switch, { props: { 'aria-label': 'd' } });
		expect(screen.getByRole('switch', { name: 'd' })).toHaveClass('min-h-touch', 'min-w-touch');
		expect(part(def.container, 'switch-track').style.width).toBe('48px');
		expect(part(def.container, 'switch-track').style.height).toBe('28px');
		expect(part(def.container, 'switch-track').style.padding).toBe('2px');
		expect(part(def.container, 'switch-thumb').style.width).toBe('24px');
		expect(part(def.container, 'switch-thumb').style.transform).toBe('translateX(0px)');
		await user.click(screen.getByRole('switch', { name: 'd' }));
		expect(part(def.container, 'switch-thumb').style.transform).toBe('translateX(20px)');
		def.unmount();

		const sm = render(Switch, { props: { 'aria-label': 's', size: 'sm', checked: true } });
		expect(part(sm.container, 'switch-track').style.width).toBe('38px');
		expect(part(sm.container, 'switch-track').style.height).toBe('22px');
		expect(part(sm.container, 'switch-thumb').style.width).toBe('18px');
		expect(part(sm.container, 'switch-thumb').style.transform).toBe('translateX(16px)');
		sm.unmount();

		const lg = render(Switch, { props: { 'aria-label': 'l', size: 'lg', checked: true } });
		expect(part(lg.container, 'switch-track').style.width).toBe('56px');
		expect(part(lg.container, 'switch-track').style.height).toBe('32px');
		expect(part(lg.container, 'switch-thumb').style.width).toBe('28px');
		expect(part(lg.container, 'switch-thumb').style.transform).toBe('translateX(24px)');
	});

	it('never renders the check when showCheck is false, even if checked', () => {
		const { container } = render(Switch, {
			props: { 'aria-label': 'Plain', checked: true, showCheck: false }
		});
		expect(container.querySelector('[data-slot="switch-thumb"] svg')).toBeNull();
	});
});

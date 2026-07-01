import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Checkbox from './checkbox.svelte';

describe('Checkbox', () => {
	it('toggles checked state and fires onCheckedChange', async () => {
		const user = userEvent.setup();
		const onCheckedChange = vi.fn();
		render(Checkbox, { props: { 'aria-label': 'Accept', onCheckedChange } });
		const box = screen.getByRole('checkbox', { name: 'Accept' });

		expect(box).toHaveAttribute('aria-checked', 'false');
		await user.click(box);
		expect(box).toHaveAttribute('aria-checked', 'true');
		expect(onCheckedChange).toHaveBeenLastCalledWith(true);
		await user.click(box);
		expect(box).toHaveAttribute('aria-checked', 'false');
	});

	it('exposes the indeterminate state as aria-checked="mixed"', () => {
		render(Checkbox, { props: { 'aria-label': 'Some', indeterminate: true } });
		expect(screen.getByRole('checkbox', { name: 'Some' })).toHaveAttribute('aria-checked', 'mixed');
	});

	it('does not toggle when disabled', async () => {
		const user = userEvent.setup();
		const onCheckedChange = vi.fn();
		render(Checkbox, { props: { 'aria-label': 'Off', disabled: true, onCheckedChange } });
		await user.click(screen.getByRole('checkbox', { name: 'Off' }));
		expect(onCheckedChange).not.toHaveBeenCalled();
	});

	it('defaults the box to size-5 and scales with the size prop', () => {
		const def = render(Checkbox, { props: { 'aria-label': 'd' } });
		expect(def.getByRole('checkbox', { name: 'd' })).toHaveClass('size-5');
		def.unmount();

		const sm = render(Checkbox, { props: { 'aria-label': 's', size: 'sm' } });
		expect(sm.getByRole('checkbox', { name: 's' })).toHaveClass('size-4');
		sm.unmount();

		const lg = render(Checkbox, { props: { 'aria-label': 'l', size: 'lg' } });
		expect(lg.getByRole('checkbox', { name: 'l' })).toHaveClass('size-6');
	});

	it('mirrors a hidden form control when a name is given', () => {
		const { container } = render(Checkbox, {
			props: { 'aria-label': 'terms', name: 'terms', value: 'yes', checked: true }
		});
		const hidden = container.querySelector(
			'input[type="checkbox"][name="terms"]'
		) as HTMLInputElement;
		expect(hidden).toBeTruthy();
		expect(hidden.value).toBe('yes');
		expect(hidden.checked).toBe(true);
	});
});

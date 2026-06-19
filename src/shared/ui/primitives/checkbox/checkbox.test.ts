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

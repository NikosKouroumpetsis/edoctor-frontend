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

	it('U-03.1: draws the application box per size (20 / 24 / 32) inside a 48 target', () => {
		const box = (container: HTMLElement) => container.querySelector('[data-slot="checkbox-box"]');
		const def = render(Checkbox, { props: { 'aria-label': 'd' } });
		expect(def.getByRole('checkbox', { name: 'd' })).toHaveClass('size-touch');
		expect(box(def.container)).toHaveClass('size-6', 'rounded-sm', 'border-input', 'bg-card');
		def.unmount();

		const sm = render(Checkbox, { props: { 'aria-label': 's', size: 'sm' } });
		expect(sm.getByRole('checkbox', { name: 's' })).toHaveClass('size-touch');
		expect(box(sm.container)).toHaveClass('size-5', 'rounded-xs');
		sm.unmount();

		const lg = render(Checkbox, { props: { 'aria-label': 'l', size: 'lg' } });
		expect(lg.getByRole('checkbox', { name: 'l' })).toHaveClass('size-touch');
		expect(box(lg.container)).toHaveClass('size-control-xs', 'rounded-sm');
	});

	it('U-03.1: checked shows the application «✓» on the primary fill, hidden from assistive tech', () => {
		const { container } = render(Checkbox, { props: { 'aria-label': 'ok', checked: true } });
		const box = container.querySelector('[data-slot="checkbox-box"]') as HTMLElement;
		expect(box).toHaveAttribute('data-state', 'checked');
		const mark = box.querySelector('span') as HTMLElement;
		expect(mark).toHaveTextContent('✓');
		expect(mark).toHaveAttribute('aria-hidden', 'true');
		expect(mark).toHaveClass('font-bold', 'text-primary-foreground', 'text-label-md');
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

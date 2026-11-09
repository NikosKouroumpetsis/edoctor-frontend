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
	it('U-28.4: with a pointer an empty box darkens under its button (the default); U-100 / D-W3-27: `hover={false}` never — the rest of the box the same', () => {
		const withHover = render(Checkbox, { props: { 'aria-label': 'Accept' } });
		const box = () =>
			screen.getByRole('checkbox', { name: 'Accept' }).querySelector('[data-slot="checkbox-box"]');
		expect(box()).toHaveClass(
			'can-hover:group-enabled:group-hover:data-[state=unchecked]:border-foreground'
		);
		const kept = [...(box()?.classList ?? [])].filter((name) => !name.includes('hover:'));
		withHover.unmount();
		render(Checkbox, { props: { 'aria-label': 'Accept', hover: false } });
		expect([...(box()?.classList ?? [])].filter((name) => name.includes('hover:'))).toEqual([]);
		expect([...(box()?.classList ?? [])]).toEqual(kept);
	});

	it('U-129: a screen’s own tick — `foreground` (the doctor sign-up: `--fg`, the mark `--page`) and `secondary` (the register form: `--dark`, `--dark-fg`); `primary` stays the default', () => {
		for (const [tone, fill, mark] of [
			[undefined, 'primary', 'text-primary-foreground'],
			['foreground', 'foreground', 'text-card'],
			['secondary', 'secondary', 'text-secondary-foreground']
		] as const) {
			const { container, unmount } = render(Checkbox, {
				props: { 'aria-label': 'ok', checked: true, ...(tone ? { tone } : {}) }
			});
			const box = container.querySelector('[data-slot="checkbox-box"]') as HTMLElement;
			expect(box).toHaveAttribute('data-tone', tone ?? 'primary');
			expect(box).toHaveClass(
				`data-[state=checked]:bg-${fill}`,
				`data-[state=checked]:border-${fill}`
			);
			expect(box.firstElementChild).toHaveClass(mark);
			unmount();
		}
	});

	it('U-129: `foreground` takes the prototype’s corner (6, `.d-box`) and its tick (`doctor.js` `tick`, 14 at 3.4); the other tones keep the 8 corner and the «✓»', () => {
		const drawn = (tone: 'primary' | 'foreground' | 'secondary') => {
			const view = render(Checkbox, { props: { 'aria-label': tone, checked: true, tone } });
			const box = view.container.querySelector('[data-slot="checkbox-box"]') as HTMLElement;
			return { box, view };
		};
		const dark = drawn('foreground');
		expect(dark.box).toHaveClass('size-6', 'rounded-checkbox');
		expect(dark.box).not.toHaveClass('rounded-sm');
		const tick = dark.box.querySelector('[data-slot="tick"]') as SVGElement;
		expect(tick).toHaveClass('icon-check-mark', 'text-card');
		expect(tick).toHaveAttribute('stroke-width', '3.4');
		expect(dark.box).not.toHaveTextContent('✓');
		dark.view.unmount();
		for (const tone of ['primary', 'secondary'] as const) {
			const other = drawn(tone);
			expect(other.box).toHaveClass('rounded-sm');
			expect(other.box).not.toHaveClass('rounded-checkbox');
			expect(other.box.querySelector('[data-slot="tick"]')).toBeNull();
			expect(other.box).toHaveTextContent('✓');
			other.view.unmount();
		}
	});

	it('U-129 (negative): a tone never brings a hex, a hover colour or another tone’s fill', () => {
		const { container } = render(Checkbox, {
			props: { 'aria-label': 'ok', checked: true, tone: 'foreground', hover: false }
		});
		const box = container.querySelector('[data-slot="checkbox-box"]') as HTMLElement;
		expect(box.className).not.toMatch(/#[0-9a-f]{3,8}|bg-primary|bg-secondary|hover:/iu);
	});
});

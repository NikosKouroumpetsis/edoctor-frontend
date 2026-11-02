import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import Toggle from './toggle.svelte';

const label = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('Toggle', () => {
	it('reflects pressed state via aria-pressed and data-state', async () => {
		const user = userEvent.setup();
		const onPressedChange = vi.fn();
		render(Toggle, { props: { 'aria-label': 'Bold', onPressedChange, children: label('B') } });
		const btn = screen.getByRole('button', { name: 'Bold' });

		expect(btn).toHaveAttribute('aria-pressed', 'false');
		expect(btn).toHaveAttribute('data-state', 'off');
		await user.click(btn);
		expect(btn).toHaveAttribute('aria-pressed', 'true');
		expect(btn).toHaveAttribute('data-state', 'on');
		expect(onPressedChange).toHaveBeenLastCalledWith(true);
	});

	// U-07.1 + R4-16: the application's sizes (`sm | md | lg`, the web's `default` was its `md`) and look: the
	// `label-md` words in the muted colour, pressed on the accent fill in the secondary foreground, the `sm` corner.
	it('U-07.1: the application’s sizes and look, md by default, every box the touch target', async () => {
		const user = userEvent.setup();
		const md = render(Toggle, { props: { 'aria-label': 'Έντονα', children: label('Έντονα') } });
		const toggle = screen.getByRole('button', { name: 'Έντονα' });
		expect(toggle).toHaveClass('min-h-touch', 'min-w-touch', 'px-2', 'rounded-sm', 'text-label-md');
		expect(toggle).toHaveClass('text-muted-foreground', 'data-[state=on]:bg-accent');
		expect(toggle).toHaveClass('data-[state=on]:text-secondary-foreground');
		expect(toggle).not.toHaveClass('rounded-md');
		await user.click(toggle);
		expect(toggle).toHaveAttribute('data-state', 'on');
		md.unmount();

		const sm = render(Toggle, { props: { 'aria-label': 's', size: 'sm', children: label('sm') } });
		expect(screen.getByRole('button', { name: 's' })).toHaveClass('min-h-touch', 'px-1.5');
		sm.unmount();
		render(Toggle, { props: { 'aria-label': 'l', size: 'lg', children: label('lg') } });
		expect(screen.getByRole('button', { name: 'l' })).toHaveClass(
			'min-h-control-lg',
			'min-w-control-lg',
			'px-2.5'
		);
	});
});

// U-31.1 (the owner, 29/10, f2's open point): a disabled toggle shows `not-allowed` (the base layer's `:disabled`
// rule, `pressable.test.ts`), so it takes the pointer — and its hover is undone, its look otherwise the same.
describe('Toggle · disabled (U-31.1)', () => {
	it('U-31.1: a disabled toggle takes the pointer (no `pointer-events-none`), and its hover gives way to its own fill and words', () => {
		render(Toggle, { props: { 'aria-label': 'Bold', disabled: true, children: label('B') } });
		const btn = screen.getByRole('button', { name: 'Bold' });
		expect(btn).toBeDisabled();
		expect(btn).not.toHaveClass('disabled:pointer-events-none');
		expect(btn).toHaveClass(
			'disabled:bg-transparent',
			'disabled:text-muted-foreground',
			'disabled:opacity-50'
		);
	});

	it('U-31.1 (negative): the enabled hover and the pressed accent stay as they were', () => {
		render(Toggle, {
			props: { 'aria-label': 'Bold', pressed: true, variant: 'outline', children: label('B') }
		});
		const btn = screen.getByRole('button', { name: 'Bold' });
		expect(btn).toHaveClass(
			'hover:bg-muted',
			'hover:text-foreground',
			'data-[state=on]:bg-accent',
			'data-[state=on]:text-secondary-foreground'
		);
		expect(btn).toHaveAttribute('data-state', 'on');
	});
});

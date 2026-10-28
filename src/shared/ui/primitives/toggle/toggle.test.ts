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

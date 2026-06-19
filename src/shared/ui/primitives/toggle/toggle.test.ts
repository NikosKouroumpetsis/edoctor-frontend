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
});

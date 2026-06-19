import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './toggle-group.harness.svelte';

describe('ToggleGroup', () => {
	it('single mode keeps at most one item pressed', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { type: 'single' } });
		const left = screen.getByRole('button', { name: 'Left' });
		const center = screen.getByRole('button', { name: 'Center' });

		await user.click(left);
		expect(left).toHaveAttribute('aria-pressed', 'true');
		await user.click(center);
		expect(center).toHaveAttribute('aria-pressed', 'true');
		expect(left).toHaveAttribute('aria-pressed', 'false');
		// Clicking the active item again clears it.
		await user.click(center);
		expect(center).toHaveAttribute('aria-pressed', 'false');
	});

	it('multiple mode allows several pressed items', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { type: 'multiple' } });
		await user.click(screen.getByRole('button', { name: 'Left' }));
		await user.click(screen.getByRole('button', { name: 'Right' }));
		expect(screen.getByRole('button', { name: 'Left' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'Right' })).toHaveAttribute('aria-pressed', 'true');
	});

	it('exposes a single roving tab stop on the first item', () => {
		render(Harness, { props: { type: 'single' } });
		expect(screen.getByRole('button', { name: 'Left' })).toHaveAttribute('tabindex', '0');
		expect(screen.getByRole('button', { name: 'Center' })).toHaveAttribute('tabindex', '-1');
	});
});

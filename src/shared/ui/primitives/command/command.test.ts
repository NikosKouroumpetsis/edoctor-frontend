import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './command.harness.svelte';

describe('Command', () => {
	it('filters items by the query, case-insensitively', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		expect(screen.getAllByRole('option')).toHaveLength(4);

		await user.type(screen.getByRole('combobox', { name: 'Search fruit' }), 'ap');
		const options = screen.getAllByRole('option');
		// "Apple" and "Grape" both contain "ap".
		expect(options.map((o) => o.textContent)).toEqual(['Apple', 'Grape']);
	});

	it('shows the empty state when nothing matches', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.type(screen.getByRole('combobox', { name: 'Search fruit' }), 'zzz');
		expect(screen.queryAllByRole('option')).toHaveLength(0);
		expect(screen.getByText('No results.')).toBeInTheDocument();
	});

	it('navigates with arrows and selects the active item with Enter', async () => {
		const user = userEvent.setup({ delay: null });
		const onSelect = vi.fn();
		render(Harness, { props: { onSelect } });
		const input = screen.getByRole('combobox', { name: 'Search fruit' });
		input.focus();
		// First item active by default; move down once -> Banana.
		await user.keyboard('{ArrowDown}{Enter}');
		expect(onSelect).toHaveBeenCalledWith('Banana');
	});

	it('selects an item on click', async () => {
		const user = userEvent.setup({ delay: null });
		const onSelect = vi.fn();
		render(Harness, { props: { onSelect } });
		await user.click(screen.getByRole('option', { name: 'Cherry' }));
		expect(onSelect).toHaveBeenCalledWith('Cherry');
	});
});

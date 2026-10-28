import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './command.harness.svelte';
import GroupsHarness from './command.groups-harness.svelte';

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

	// 4λ (the application's `molecules/command`): a 1px line above every shown group after the first; a group none
	// of whose items matches hides with its heading, and the line moves to the next shown group.
	it('4λ: draws a line between shown groups and hides a group without a match', async () => {
		const user = userEvent.setup({ delay: null });
		const { container } = render(GroupsHarness);
		const groups = () =>
			[...container.querySelectorAll('[data-slot="command-group"]')] as HTMLElement[];
		const lines = () => container.querySelectorAll('[data-slot="command-separator"]');
		expect(screen.getAllByRole('group')).toHaveLength(2);
		expect(screen.getByRole('group', { name: 'Ρυθμίσεις' })).toBeInTheDocument();
		expect(lines()).toHaveLength(1);
		expect(groups()[1].querySelector('[data-slot="command-separator"]')).toHaveClass(
			'h-px',
			'bg-border'
		);

		await user.type(screen.getByRole('combobox', { name: 'Αναζήτηση εντολής' }), 'προφ');
		expect(groups()[0].hidden).toBe(true);
		expect(groups()[1].hidden).toBe(false);
		expect(lines()).toHaveLength(0);
		expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Προφίλ']);
	});

	it('4λ: a search the caller holds filters from the first render (the empty state)', () => {
		render(GroupsHarness, { props: { value: 'Πληρωμές' } });
		expect(screen.queryAllByRole('option')).toHaveLength(0);
		expect(screen.getByText('Δεν βρέθηκαν αποτελέσματα.')).toBeInTheDocument();
		expect(document.querySelectorAll('[data-slot="command-group"]:not([hidden])')).toHaveLength(0);
	});

	// MINOR-1 (R1 review): the line follows the order on the page, not the order of mounting — a group that mounts
	// later ABOVE the others takes its place: no line over it, one under it.
	it('MINOR-1: a group mounted later above another — the line is drawn only between the shown groups', async () => {
		const { container, rerender } = render(GroupsHarness);
		await rerender({ early: true });
		const groups = [...container.querySelectorAll('[data-slot="command-group"]')] as HTMLElement[];
		const heading = (group: HTMLElement) => group.querySelector('[id$="-heading"]')?.textContent;
		expect(groups.map(heading)).toEqual(['Πρόσφατα', 'Προτάσεις', 'Ρυθμίσεις']);
		const separated = groups.map(
			(group) => group.querySelector('[data-slot="command-separator"]') !== null
		);
		expect(separated).toEqual([false, true, true]);
	});
});

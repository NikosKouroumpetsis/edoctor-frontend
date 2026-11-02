import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './combobox.harness.svelte';
import Combobox from './combobox.svelte';

describe('Combobox', () => {
	it('reveals the placeholder only while focused', async () => {
		const user = userEvent.setup();
		render(Combobox, {
			props: {
				label: 'Specialty',
				emptyText: 'No results',
				clearLabel: 'Clear',
				toggleLabel: 'Toggle options',
				options: [{ label: 'A', value: 'a' }],
				placeholder: 'Search…'
			}
		});
		const input = screen.getByRole('combobox');

		expect(input).toHaveAttribute('placeholder', ' ');
		await user.click(input);
		expect(input).toHaveAttribute('placeholder', 'Search…');
		expect(input.className).not.toContain('placeholder:text-transparent');
	});

	it('filters options diacritics-insensitively as you type', async () => {
		const user = userEvent.setup();
		render(Harness);
		const input = screen.getByRole('combobox');

		await user.click(input);
		// "νευρ" (no accent issue here) should narrow to a single match.
		await user.type(input, 'νευρ');

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(1);
		expect(options[0]).toHaveTextContent('Νευρολόγος');
	});

	it('selecting an option commits its value and shows its label', async () => {
		const user = userEvent.setup();
		render(Harness);
		const input = screen.getByRole('combobox') as HTMLInputElement;

		await user.click(input);
		await user.click(screen.getByRole('option', { name: 'Καρδιολόγος' }));

		expect(input.value).toBe('Καρδιολόγος');
		expect(screen.getByTestId('cb-value')).toHaveTextContent('cardio');
	});

	it('commits free text when nothing matches', async () => {
		const user = userEvent.setup();
		render(Harness);
		const input = screen.getByRole('combobox');

		await user.click(input);
		await user.type(input, 'zzz');

		expect(screen.queryAllByRole('option')).toHaveLength(0);
		expect(screen.getByTestId('cb-value')).toHaveTextContent('zzz');
	});

	it('does not commit free text in strict mode', async () => {
		const user = userEvent.setup();
		render(Harness, { allowFreeText: false });
		const input = screen.getByRole('combobox');

		await user.click(input);
		await user.type(input, 'zzz');

		expect(screen.getByTestId('cb-value')).toHaveTextContent('empty');
	});

	it('selects the highlighted option with the keyboard', async () => {
		const user = userEvent.setup();
		render(Harness);
		const input = screen.getByRole('combobox') as HTMLInputElement;

		await user.click(input);
		await user.keyboard('{ArrowDown}{Enter}');

		expect(input.value).toBe('Καρδιολόγος');
		expect(screen.getByTestId('cb-value')).toHaveTextContent('cardio');
	});
});

// U-31.1 (the owner, 29/10, f2's open point): the field drives the list with the arrows, so it names the active option
// for assistive tech (`aria-activedescendant`, as `SearchField` and `Command`); each option keeps ONE id.
describe('Combobox · aria-activedescendant (U-31.1)', () => {
	it('U-31.1: the arrows move `aria-activedescendant` to the active option; each option keeps its id whatever is typed', async () => {
		const user = userEvent.setup();
		render(Harness);
		const input = screen.getByRole('combobox');
		await user.click(input);
		await user.keyboard('{ArrowDown}');
		const options = screen.getAllByRole('option');
		expect(new Set(options.map((option) => option.id)).size).toBe(3);
		expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
		await user.keyboard('{ArrowDown}');
		expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
		const derma = options[1].id;
		await user.type(input, 'Δερ');
		expect(screen.getByRole('option', { name: 'Δερματολόγος' })).toHaveAttribute('id', derma);
	});

	it('U-31.1 (negative): nothing is named while no option is active or the list is closed', async () => {
		const user = userEvent.setup();
		render(Harness);
		const input = screen.getByRole('combobox');
		expect(input).not.toHaveAttribute('aria-activedescendant');
		await user.click(input);
		expect(input).not.toHaveAttribute('aria-activedescendant');
		await user.keyboard('{ArrowDown}');
		expect(input).toHaveAttribute('aria-activedescendant');
		await user.keyboard('{Escape}');
		expect(input).not.toHaveAttribute('aria-activedescendant');
	});
});

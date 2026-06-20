import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './combobox.harness.svelte';
import Combobox from './combobox.svelte';

describe('Combobox', () => {
	it('reveals the placeholder only while focused', async () => {
		const user = userEvent.setup();
		render(Combobox, {
			props: { label: 'Specialty', options: [{ label: 'A', value: 'a' }], placeholder: 'Search…' }
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

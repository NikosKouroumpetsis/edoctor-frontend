import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './select.harness.svelte';

describe('Select', () => {
	it('opens the listbox and selects an option, updating the trigger value', async () => {
		const user = userEvent.setup();
		render(Harness);
		const trigger = screen.getByRole('combobox', { name: 'Specialty' });
		expect(trigger).toHaveTextContent('Pick a specialty');

		await user.click(trigger);
		expect(screen.getByRole('listbox')).toBeInTheDocument();
		await user.click(screen.getByRole('option', { name: 'Dermatology' }));

		await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
		expect(trigger).toHaveTextContent('Dermatology');
	});

	it('opens with the keyboard and reflects the selection in the hidden input', async () => {
		const user = userEvent.setup();
		const { container } = render(Harness);
		const trigger = screen.getByRole('combobox', { name: 'Specialty' });
		trigger.focus();
		await user.keyboard('{ArrowDown}');
		expect(screen.getByRole('listbox')).toBeInTheDocument();
		await user.click(screen.getByRole('option', { name: 'Neurology' }));
		expect(container.querySelector('input[name="specialty"]')).toHaveValue('neuro');
	});

	it('marks the selected option with aria-selected', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { value: 'cardio' } });
		await user.click(screen.getByRole('combobox', { name: 'Specialty' }));
		expect(screen.getByRole('option', { name: 'Cardiology' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		expect(screen.getByRole('option', { name: 'Neurology' })).toHaveAttribute(
			'aria-selected',
			'false'
		);
	});
});

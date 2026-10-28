import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Select from './select.svelte';
import { filterOptions } from './index';

const options = [
	{ value: 'recent', label: 'Πιο πρόσφατες' },
	{ value: 'high', label: 'Υψηλότερη βαθμολογία', subtitle: 'Πρώτα τα 5 αστέρια' },
	{ value: 'low', label: 'Χαμηλότερη βαθμολογία' }
];

describe('Select', () => {
	it('U-03.1: the field trigger rests on its placeholder, muted, with the chevron (K: Select field)', () => {
		render(Select, { props: { options, placeholder: 'Ταξινόμηση', 'aria-label': 'Ταξινόμηση' } });
		const trigger = screen.getByRole('combobox', { name: 'Ταξινόμηση' });
		expect(trigger).toHaveClass(
			'min-h-control-md',
			'w-full',
			'rounded-md',
			'px-3.5',
			'border-input',
			'bg-card'
		);
		expect(screen.getByText('Ταξινόμηση')).toHaveClass(
			'flex-1',
			'text-body-md',
			'text-muted-foreground'
		);
		expect(trigger.querySelector('[data-icon="chevron-down"]')).toHaveClass(
			'icon-md',
			'text-muted-foreground'
		);
	});

	it('U-03.2: choosing an option calls onChange with the value and shows its label', async () => {
		const user = userEvent.setup({ delay: null });
		const onChange = vi.fn();
		render(Select, {
			props: { options, placeholder: 'Ταξινόμηση', 'aria-label': 'Ταξινόμηση', onChange }
		});
		const trigger = screen.getByRole('combobox', { name: 'Ταξινόμηση' });
		await user.click(trigger);
		const high = screen.getByRole('option', { name: /Υψηλότερη βαθμολογία/ });
		expect(high).toHaveTextContent('Πρώτα τα 5 αστέρια');
		await user.click(high);
		expect(onChange).toHaveBeenCalledWith('high');
		await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
		expect(trigger).toHaveTextContent('Υψηλότερη βαθμολογία');
		expect(screen.getByText('Υψηλότερη βαθμολογία')).toHaveClass('text-foreground');
	});

	it('U-03.1: the chosen option reads primary-text with its check; pill and invalid looks', async () => {
		const user = userEvent.setup({ delay: null });
		render(Select, {
			props: {
				options,
				value: 'low',
				variant: 'pill',
				invalid: true,
				placeholder: 'Σειρά',
				'aria-label': 'Σειρά'
			}
		});
		const trigger = screen.getByRole('combobox', { name: 'Σειρά' });
		expect(trigger).toHaveClass('min-h-touch', 'rounded-full', 'px-4', 'border-danger');
		expect(screen.getByText('Χαμηλότερη βαθμολογία')).toHaveClass('text-body-sm', 'font-semibold');
		await user.click(trigger);
		const chosen = screen.getByRole('option', { name: /Χαμηλότερη/ });
		expect(chosen).toHaveAttribute('aria-selected', 'true');
		expect(chosen.querySelector('.text-primary-text')).toHaveTextContent('Χαμηλότερη βαθμολογία');
		expect(chosen.querySelector('[data-icon="checkmark"]')).not.toBeNull();
	});

	it('U-03.1: searchable filters the options as typed, case-insensitively', async () => {
		const user = userEvent.setup({ delay: null });
		render(Select, {
			props: {
				options,
				placeholder: 'Ταξινόμηση',
				'aria-label': 'Ταξινόμηση',
				searchable: true,
				searchPlaceholder: 'Αναζήτηση'
			}
		});
		await user.click(screen.getByRole('combobox', { name: 'Ταξινόμηση' }));
		await user.type(screen.getByRole('searchbox', { name: 'Αναζήτηση' }), 'ΒΑΘΜ');
		expect(screen.getAllByRole('option')).toHaveLength(2);
		expect(filterOptions(options, '  πρόσ ')).toEqual([options[0]]);
	});

	// U-06.2 / R4-17: a content-width trigger (`w-fit`, one line) grew past its parent with a long label; it is now
	// capped at the parent (`max-w-full`) and the words are cut with «…» inside it (`min-w-0 truncate`).
	it('U-06.2: the pill trigger never grows past its parent; its words truncate inside it', () => {
		render(Select, {
			props: {
				options,
				placeholder: 'Μια πολύ μεγάλη ετικέτα ταξινόμησης που δεν χωρά ποτέ',
				'aria-label': 'Ταξινόμηση',
				variant: 'pill'
			}
		});
		const trigger = screen.getByRole('combobox', { name: 'Ταξινόμηση' });
		expect(trigger).toHaveClass('w-fit', 'max-w-full', 'min-w-touch');
		expect(screen.getByText('Μια πολύ μεγάλη ετικέτα ταξινόμησης που δεν χωρά ποτέ')).toHaveClass(
			'min-w-0',
			'truncate'
		);
	});
});

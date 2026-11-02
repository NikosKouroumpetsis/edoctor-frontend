import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { SearchPill, type SearchPillGroup } from './index';

const groups: SearchPillGroup[] = [
	{
		id: 'services',
		label: 'Υπηρεσίες',
		options: [{ id: 's1', title: 'Αιματολογικές εξετάσεις', subtitle: 'Υπηρεσία · 1 άρθρο' }]
	},
	{
		id: 'articles',
		label: 'Άρθρα',
		options: [{ id: 'a1', title: 'Πώς να διαβάσετε τις αιματολογικές σας εξετάσεις' }]
	}
];

const base = {
	placeholder: 'Αναζήτηση σε άρθρα',
	clearLabel: 'Καθαρισμός αναζήτησης',
	submitLabel: 'Αναζήτηση',
	listLabel: 'Προτάσεις',
	emptyLabel: 'Δεν βρέθηκαν αποτελέσματα'
};

describe('SearchPill', () => {
	it('U-57.5 Ε5 (as the doctors’ search): the suggestions open from TWO characters, never from one', async () => {
		const user = userEvent.setup({ delay: null });
		render(SearchPill, { props: { ...base, groups, onSubmit: vi.fn() } });
		const field = screen.getByRole('combobox', { name: 'Αναζήτηση σε άρθρα' });
		await user.type(field, 'α');
		expect(field).toHaveAttribute('aria-expanded', 'false');
		await user.type(field, 'ι');
		expect(field).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getAllByRole('option')).toHaveLength(2);
		expect(screen.getByText('Υπηρεσίες')).toBeInTheDocument();
	});

	it('U-57.5 Ε5: ↓ chooses a row (the focus stays in the field), Enter opens it, Esc closes the panel', async () => {
		const user = userEvent.setup({ delay: null });
		const onPick = vi.fn();
		const onSubmit = vi.fn();
		render(SearchPill, { props: { ...base, groups, onPick, onSubmit } });
		const field = screen.getByRole('combobox');
		await user.type(field, 'αιμ');
		await user.keyboard('{ArrowDown}{ArrowDown}');
		const active = field.getAttribute('aria-activedescendant');
		expect(document.getElementById(active ?? '')).toHaveTextContent('Πώς να διαβάσετε');
		expect(field).toHaveFocus();
		await user.keyboard('{Enter}');
		expect(onPick).toHaveBeenCalledWith(groups[1].options[0], groups[1]);
		expect(onSubmit).not.toHaveBeenCalled();
		await user.type(field, 'α');
		expect(field).toHaveAttribute('aria-expanded', 'true');
		await user.keyboard('{Escape}');
		expect(field).toHaveAttribute('aria-expanded', 'false');
	});

	it('U-57.5 Ε5: Enter without a chosen row (or the magnifier) runs the search with the words', async () => {
		const user = userEvent.setup({ delay: null });
		const onSubmit = vi.fn();
		render(SearchPill, { props: { ...base, groups, onSubmit } });
		const field = screen.getByRole('combobox');
		await user.type(field, '  πίεση ');
		await user.keyboard('{Enter}');
		expect(onSubmit).toHaveBeenLastCalledWith('πίεση');
		await fireEvent.click(screen.getByRole('button', { name: 'Αναζήτηση' }));
		expect(onSubmit).toHaveBeenCalledTimes(2);
	});

	it('U-57.3: the matching part of a suggestion is bold, anywhere inside a word, accents folded', async () => {
		const user = userEvent.setup({ delay: null });
		render(SearchPill, { props: { ...base, groups, onSubmit: vi.fn() } });
		await user.type(screen.getByRole('combobox'), 'ΑΙΜΑ');
		const strong = screen.getAllByRole('option')[0].querySelector('strong');
		expect(strong).toHaveTextContent('Αιμα');
	});

	it('U-57.3 (negative): while the suggestions load the panel never says «none»; a field without suggestions only searches', async () => {
		const user = userEvent.setup({ delay: null });
		const { rerender } = render(SearchPill, {
			props: { ...base, groups: [], ready: false, onSubmit: vi.fn() }
		});
		const field = screen.getByRole('combobox');
		await user.type(field, 'ξψζ');
		expect(screen.queryByText('Δεν βρέθηκαν αποτελέσματα')).not.toBeInTheDocument();
		await rerender({ ...base, groups: [], ready: true, onSubmit: vi.fn() });
		expect(screen.getByText('Δεν βρέθηκαν αποτελέσματα')).toBeInTheDocument();
		await rerender({ ...base, groups, suggests: false, onSubmit: vi.fn() });
		expect(field).toHaveAttribute('aria-expanded', 'false');
	});

	it('U-57.3: the «×» shows only with words; it empties the field and keeps the focus there', async () => {
		const user = userEvent.setup({ delay: null });
		const onClear = vi.fn();
		render(SearchPill, { props: { ...base, onSubmit: vi.fn(), onClear } });
		expect(screen.queryByRole('button', { name: 'Καθαρισμός αναζήτησης' })).not.toBeInTheDocument();
		const field = screen.getByRole('combobox');
		await user.type(field, 'νερό');
		await user.click(screen.getByRole('button', { name: 'Καθαρισμός αναζήτησης' }));
		expect(field).toHaveValue('');
		expect(field).toHaveFocus();
		expect(onClear).toHaveBeenCalledTimes(1);
	});

	it('MINOR-3 of r1 (the APG grouped listbox): the options sit in groups named by their titles; «none» is a status beside the list', async () => {
		const user = userEvent.setup({ delay: null });
		const { rerender } = render(SearchPill, { props: { ...base, groups, onSubmit: vi.fn() } });
		await user.type(screen.getByRole('combobox'), 'αιμ');
		const listbox = screen.getByRole('listbox', { name: 'Προτάσεις' });
		const [services, articles] = within(listbox).getAllByRole('group');
		expect(services).toHaveAccessibleName('Υπηρεσίες');
		expect(within(articles).getAllByRole('option')).toHaveLength(1);
		await rerender({ ...base, groups: [], ready: true, onSubmit: vi.fn() });
		const none = screen.getByRole('status');
		expect(none).toHaveTextContent('Δεν βρέθηκαν αποτελέσματα');
		expect(listbox.contains(none)).toBe(false);
	});

	it('NIT-1 of r1: without JavaScript the form keeps the other parts of the address as hidden fields', () => {
		const { container } = render(SearchPill, {
			props: { ...base, onSubmit: vi.fn(), keep: { type: 'advice', service: null, topic: '' } }
		});
		const hidden = [...container.querySelectorAll('input[type="hidden"]')].map((field) => [
			field.getAttribute('name'),
			field.getAttribute('value')
		]);
		expect(hidden).toEqual([['type', 'advice']]);
		expect(container.querySelector('input[name="q"]')).toBeInTheDocument();
	});

	it('U-58.1 / U-60.2 (app = web): below 744 the application’s inset pill — the magnifier inside at 16, no accent button; from 744 the web’s', () => {
		const { container } = render(SearchPill, { props: { ...base, onSubmit: vi.fn() } });
		const field = container.querySelector('[data-slot="search-pill-field"]');
		expect(field).toHaveClass('border-input', 'pl-4', 'gap-2', 'h-control-md');
		expect(field).toHaveClass('tablet:pl-6', 'tablet:shadow-raised', 'tablet:h-control-lg');
		expect(field).not.toHaveClass('shadow-raised');
		expect(container.querySelector('[data-slot="search-pill-glyph"]')).toHaveClass('tablet:hidden');
		expect(container.querySelector('[data-slot="search-pill-submit"]')).toHaveClass(
			'hidden',
			'tablet:grid'
		);
	});
});

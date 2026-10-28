import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SearchField from './search-field.svelte';
import Harness from './search-field.harness.svelte';

const words = { placeholder: 'Ειδικότητα, γιατρός', 'aria-label': 'Τι ψάχνετε;' };
const rootOf = (container: HTMLElement) =>
	container.querySelector('[data-slot="search-field"]') as HTMLElement;

describe('SearchField', () => {
	it('U-03.1 (K4.3, D2 launcher): a button drawn as a field — the 50 % muted border, the glyph, 15 words', async () => {
		const onclick = vi.fn();
		const { container } = render(SearchField, {
			props: { ...words, variant: 'launcher', onclick, testId: 'search-criteria-what-launcher' }
		});
		expect(rootOf(container)).toHaveClass(
			'flex',
			'min-h-row',
			'flex-row',
			'items-center',
			'gap-2',
			'rounded-md',
			'border',
			'border-muted-foreground/50',
			'bg-card',
			'px-3'
		);
		expect(container.querySelector('[data-icon="search-outline"]')).toHaveClass(
			'icon-md',
			'text-muted-foreground'
		);
		const launcher = screen.getByRole('button', { name: 'Τι ψάχνετε;' });
		expect(launcher).toHaveClass('min-h-touch', 'min-w-touch', 'flex-1', 'justify-center');
		expect(launcher).toHaveAttribute('data-testid', 'search-criteria-what-launcher');
		expect(screen.getByText('Ειδικότητα, γιατρός')).toHaveClass(
			'text-body-md',
			'text-muted-foreground'
		);
		await userEvent.setup({ delay: null }).click(launcher);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-03.1 (K4.3): the launcher shows the value in the text colour, the placeholder only when empty', () => {
		render(SearchField, {
			props: { ...words, variant: 'launcher', value: 'Καρδιολόγος', onclick: () => {} }
		});
		expect(screen.getByText('Καρδιολόγος')).toHaveClass('text-body-md', 'text-foreground');
		expect(screen.queryByText('Ειδικότητα, γιατρός')).toBeNull();
	});

	it('U-03.1 (K4.3, D2 active): the dark 2px field 56 tall with «‹», the 16 input and the tinted clear', async () => {
		const user = userEvent.setup({ delay: null });
		const onBack = vi.fn();
		const onClear = vi.fn();
		const onChangeText = vi.fn();
		const { container } = render(SearchField, {
			props: {
				...words,
				variant: 'active',
				onBack,
				backLabel: 'Πίσω',
				onClear,
				clearLabel: 'Καθαρισμός',
				onChangeText,
				testId: 'search-criteria-what-input',
				clearTestId: 'search-criteria-what-clear'
			}
		});
		expect(rootOf(container)).toHaveClass(
			'flex',
			'min-h-control-lg',
			'flex-row',
			'items-center',
			'gap-touch-gap',
			'rounded-md',
			'border-2',
			'border-foreground',
			'bg-card',
			'px-1'
		);
		const back = screen.getByRole('button', { name: 'Πίσω' });
		expect(back.querySelector('[data-icon="chevron-back"]')).toHaveClass('icon-lg');
		const input = screen.getByRole('searchbox', { name: 'Τι ψάχνετε;' });
		expect(input).toHaveClass(
			'min-h-touch',
			'flex-1',
			'text-body-lg',
			'text-foreground',
			'placeholder:text-muted-foreground'
		);
		expect(input).toHaveAttribute('placeholder', 'Ειδικότητα, γιατρός');
		expect(input).toHaveAttribute('enterkeyhint', 'search');
		expect(screen.queryByRole('button', { name: 'Καθαρισμός' })).toBeNull();

		await user.type(input, 'Καρδ');
		expect(onChangeText).toHaveBeenLastCalledWith('Καρδ');
		const clear = screen.getByRole('button', { name: 'Καθαρισμός' });
		expect(clear).toHaveAttribute('data-testid', 'search-criteria-what-clear');
		expect(clear.querySelector('[data-slot="icon-button-shape"]')).toHaveClass(
			'size-control-xs',
			'bg-muted'
		);
		expect(clear.querySelector('[data-icon="close"]')).toHaveClass('icon-md');
		await user.click(clear);
		expect(input).toHaveValue('');
		expect(onClear).toHaveBeenCalledOnce();
		expect(onChangeText).toHaveBeenLastCalledWith('');
		expect(input).toHaveFocus();
		await user.click(back);
		expect(onBack).toHaveBeenCalledOnce();
	});

	it('U-03.1 (K4.3, D2 inset): the bordered input with the glyph inside (pl-field-inset) and the bare muted clear', async () => {
		const user = userEvent.setup({ delay: null });
		const { container } = render(SearchField, {
			props: { ...words, variant: 'inset', onClear: () => {}, clearLabel: 'Καθαρισμός' }
		});
		expect(rootOf(container)).toHaveClass(
			'relative',
			'flex',
			'w-full',
			'flex-col',
			'justify-center'
		);
		const glyph = container.querySelector('[data-icon="search"]') as Element;
		expect(glyph).toHaveClass('icon-md', 'text-muted-foreground');
		expect(glyph.parentElement).toHaveClass('pointer-events-none', 'absolute', 'left-3', 'z-10');
		const input = screen.getByRole('searchbox', { name: 'Τι ψάχνετε;' });
		expect(input).toHaveClass(
			'rounded-md',
			'border',
			'border-input',
			'bg-card',
			'text-foreground',
			'min-h-control-md',
			'px-3.5',
			'pl-field-inset'
		);
		expect(input).not.toHaveClass('pr-touch');
		await user.type(input, 'Αθ');
		expect(input).toHaveClass('pr-touch');
		const clear = screen.getByRole('button', { name: 'Καθαρισμός' });
		expect(clear).toHaveClass('absolute', 'right-0', 'z-10');
		expect(clear.querySelector('[data-icon="close-circle"]')).toHaveClass(
			'icon-md',
			'text-muted-foreground'
		);
	});

	it('U-03.1 (negative): no `onClear` ⇒ no clear even with words; a disabled field offers none either', () => {
		const plain = render(SearchField, { props: { ...words, variant: 'inset', value: 'Αθήνα' } });
		expect(plain.queryByRole('button')).toBeNull();
		plain.unmount();
		render(SearchField, {
			props: {
				...words,
				variant: 'inset',
				value: 'Αθήνα',
				disabled: true,
				onClear: () => {},
				clearLabel: 'Καθαρισμός'
			}
		});
		expect(screen.queryByRole('button', { name: 'Καθαρισμός' })).toBeNull();
		expect(screen.getByRole('searchbox')).toBeDisabled();
	});

	it('U-03.5 (from the application): the inset clear without a name is `common_clear_search`; a launcher has no clear', () => {
		const inset = render(SearchField, {
			props: { ...words, variant: 'inset', value: 'Αθήνα', onClear: () => {} }
		});
		expect(screen.getByRole('button', { name: 'Καθαρισμός αναζήτησης' })).toBeInTheDocument();
		inset.unmount();
		render(SearchField, {
			props: { ...words, variant: 'launcher', value: 'Αθήνα', onclick: () => {} }
		});
		expect(screen.getAllByRole('button')).toHaveLength(1);
		expect(screen.queryByRole('searchbox')).toBeNull();
	});

	it('U-03.1 (K4.4, a11y, precedent `command`): a combobox — the arrows move aria-activedescendant, Enter commits', async () => {
		const user = userEvent.setup({ delay: null });
		const onCommit = vi.fn();
		render(Harness, { props: { withListbox: true, onCommit } });
		const input = screen.getByRole('combobox', { name: 'Τι ψάχνετε;' });
		expect(input).toHaveAttribute('aria-controls', 'suggestions');
		expect(input).toHaveAttribute('aria-expanded', 'true');
		expect(input).toHaveAttribute('aria-autocomplete', 'list');
		expect(input).not.toHaveAttribute('aria-activedescendant');
		input.focus();
		await user.keyboard('{ArrowDown}');
		expect(input).toHaveAttribute('aria-activedescendant', 'option-cardiology');
		await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
		expect(input).toHaveAttribute('aria-activedescendant', 'option-cardiology');
		await user.keyboard('{ArrowUp}');
		expect(input).toHaveAttribute('aria-activedescendant', 'option-neurology');
		expect(screen.getByRole('option', { name: 'option-neurology' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await user.keyboard('{Enter}');
		expect(onCommit).toHaveBeenCalledWith('option-neurology');
		await user.keyboard('κ');
		expect(input).not.toHaveAttribute('aria-activedescendant');
		expect(screen.getByTestId('active')).toHaveTextContent('none');
	});

	it('U-03.1 (MINOR-1 of the R1, dyad 4): Home and End stay the caret’s — with options and with none', async () => {
		const user = userEvent.setup({ delay: null });
		const list = render(Harness, { props: { withListbox: true } });
		const input = screen.getByRole('combobox', { name: 'Τι ψάχνετε;' });
		input.focus();
		await user.keyboard('{ArrowDown}');
		expect(input).toHaveAttribute('aria-activedescendant', 'option-cardiology');
		expect(await fireEvent.keyDown(input, { key: 'Home' })).toBe(true);
		expect(await fireEvent.keyDown(input, { key: 'End' })).toBe(true);
		expect(input).toHaveAttribute('aria-activedescendant', 'option-cardiology');
		list.unmount();
		render(SearchField, {
			props: {
				...words,
				variant: 'inset',
				listboxId: 'none',
				optionIds: [],
				onCommit: () => {}
			}
		});
		const empty = screen.getByRole('combobox');
		expect(empty).toHaveAttribute('aria-expanded', 'false');
		expect(await fireEvent.keyDown(empty, { key: 'End' })).toBe(true);
		expect(await fireEvent.keyDown(empty, { key: 'ArrowDown' })).toBe(true);
		expect(empty).not.toHaveAttribute('aria-activedescendant');
	});

	it('U-03.1 (negative): without a list the field is a plain searchbox and the arrows move nothing', async () => {
		render(Harness);
		const input = screen.getByRole('searchbox');
		expect(input).not.toHaveAttribute('aria-activedescendant');
		input.focus();
		await userEvent.setup({ delay: null }).keyboard('{ArrowDown}{Enter}');
		expect(screen.queryByRole('combobox')).toBeNull();
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', () => {
		const views = [
			render(SearchField, {
				props: { ...words, variant: 'launcher', value: 'Αθήνα', onclick: () => {} }
			}),
			render(SearchField, {
				props: {
					...words,
					variant: 'active',
					value: 'Αθήνα',
					onBack: () => {},
					backLabel: 'Πίσω',
					onClear: () => {},
					clearLabel: 'Καθαρισμός'
				}
			}),
			render(SearchField, {
				props: { ...words, variant: 'inset', value: 'Αθήνα', onClear: () => {} }
			})
		];
		for (const view of views)
			expect(view.container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});

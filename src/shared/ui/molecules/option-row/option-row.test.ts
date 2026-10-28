import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import OptionRow from './option-row.svelte';
import Harness from './option-row.harness.svelte';

const tileOf = (row: HTMLElement) =>
	row.querySelector('[data-slot="option-row-tile"]') as HTMLElement;

describe('OptionRow', () => {
	it('U-03.1 (K4.4, M-36): the 56 row — the 40 tile with the 24 glyph, the 14 semibold label and the muted line', async () => {
		const onclick = vi.fn();
		render(OptionRow, {
			props: {
				label: 'Αθήνα',
				supportingLabel: 'Αττική',
				icon: 'location-outline',
				isSelected: false,
				onclick,
				testId: 'search-criteria-option-athens'
			}
		});
		const row = screen.getByRole('button', { name: /Αθήνα/ });
		expect(row).toHaveClass(
			'flex',
			'min-h-row',
			'w-full',
			'flex-row',
			'items-center',
			'rounded-md',
			'py-2',
			'gap-2.5',
			'px-2',
			'bg-transparent'
		);
		expect(row).not.toHaveClass('border', 'opacity-40');
		expect(row).toHaveAttribute('aria-pressed', 'false');
		expect(row).toHaveAttribute('data-testid', 'search-criteria-option-athens');
		expect(tileOf(row)).toHaveClass('size-control-sm', 'rounded-md', 'bg-foreground/5');
		expect(row.querySelector('[data-icon="location-outline"]')).toHaveClass(
			'icon-lg',
			'text-foreground'
		);
		expect(screen.getByText('Αθήνα')).toHaveClass(
			'line-clamp-1',
			'text-body-sm',
			'font-semibold',
			'text-foreground'
		);
		expect(screen.getByText('Αττική')).toHaveClass(
			'line-clamp-1',
			'text-label-md',
			'text-muted-foreground'
		);
		expect(row.querySelector('[data-icon="checkmark"]')).toBeNull();
		await userEvent.setup({ delay: null }).click(row);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-03.1 (K4.4): the chosen row — the primary tint, the card tile, the primary glyph and the 20 check', () => {
		render(OptionRow, {
			props: { label: 'Αθήνα', icon: 'location-outline', isSelected: true }
		});
		const row = screen.getByRole('button', { name: /Αθήνα/ });
		expect(row).toHaveClass('bg-primary/10');
		expect(row).toHaveAttribute('aria-pressed', 'true');
		expect(tileOf(row)).toHaveClass('bg-card');
		expect(row.querySelector('[data-icon="location-outline"]')).toHaveClass('text-primary');
		expect(row.querySelector('[data-icon="checkmark"]')).toHaveClass('icon-md', 'text-primary');
	});

	it('U-03.1 (K4.4): `labelClass` replaces the semibold (results: medium) and a query bolds the match', () => {
		const { container } = render(OptionRow, {
			props: {
				label: 'Καρδιολόγος',
				labelClass: 'font-medium',
				query: 'καρδ',
				icon: 'medkit-outline',
				isSelected: false
			}
		});
		const label = container.querySelector('[data-slot="highlight-text"]') as HTMLElement;
		expect(label).toHaveClass('line-clamp-1', 'text-body-sm', 'text-foreground', 'font-medium');
		expect(label).not.toHaveClass('font-semibold');
		expect(container.querySelector('[data-slot="highlight-text-match"]')).toHaveTextContent('Καρδ');
	});

	it('U-03.1 (K4.4, the language rows): `lg`, bordered, a radio, no tile (`leading={null}`), the count', () => {
		const view = render(OptionRow, {
			props: {
				accessibilityRole: 'radio',
				size: 'lg',
				bordered: true,
				leading: null,
				label: 'Αγγλικά',
				labelClass: 'font-medium',
				count: '12',
				isSelected: false
			}
		});
		const row = screen.getByRole('radio', { name: /Αγγλικά/ });
		expect(row).toHaveClass('gap-3', 'px-3', 'border', 'border-border/60');
		expect(row).toHaveAttribute('aria-checked', 'false');
		expect(tileOf(row)).toBeNull();
		expect(screen.getByText('Αγγλικά')).toHaveClass('text-body-md');
		expect(screen.getByText('12')).toHaveClass('text-label-md', 'text-muted-foreground');
		view.unmount();
		render(OptionRow, {
			props: {
				accessibilityRole: 'radio',
				bordered: true,
				leading: null,
				label: 'Αγγλικά',
				isSelected: true
			}
		});
		expect(screen.getByRole('radio')).toHaveClass('border-foreground', 'bg-primary/10');
		expect(screen.getByRole('radio')).toHaveAttribute('aria-checked', 'true');
	});

	it('U-03.1 (negative): busy ⇒ the spinner in the tile, refused, not dimmed; disabled ⇒ dimmed 40 and refused', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		const busy = render(OptionRow, {
			props: { label: 'Κοντά μου', isBusy: true, isSelected: false, onclick, testId: 'near-me' }
		});
		const row = screen.getByRole('button', { name: /Κοντά μου/ });
		expect(screen.getByTestId('near-me-busy')).toHaveAttribute('data-slot', 'spinner');
		expect(row).toBeDisabled();
		expect(row).toHaveAttribute('aria-busy', 'true');
		expect(row).not.toHaveClass('opacity-40');
		await user.click(row);
		busy.unmount();
		render(OptionRow, { props: { label: 'Αθήνα', disabled: true, isSelected: false, onclick } });
		expect(screen.getByRole('button')).toHaveClass('opacity-40');
		await user.click(screen.getByRole('button'));
		expect(onclick).not.toHaveBeenCalled();
	});

	it('U-03.1 (K4.4, a11y, web only): an `option` row takes no focus; `active` is aria-selected and the ring', () => {
		render(OptionRow, {
			props: {
				accessibilityRole: 'option',
				id: 'option-athens',
				label: 'Αθήνα',
				isSelected: true,
				active: true
			}
		});
		const row = screen.getByRole('option', { name: /Αθήνα/ });
		expect(row).toHaveAttribute('id', 'option-athens');
		expect(row).toHaveAttribute('tabindex', '-1');
		expect(row).toHaveAttribute('aria-selected', 'true');
		expect(row).toHaveAttribute('aria-checked', 'true');
		expect(row).toHaveAttribute('data-active');
		expect(row).toHaveClass('data-[active]:ring-3', 'data-[active]:ring-inset');
	});

	it('U-03.1 (K4.4, typeahead): the field drives the grouped rows — the arrows move the active row, Enter picks it', async () => {
		const user = userEvent.setup({ delay: null });
		const onSelect = vi.fn();
		render(Harness, { props: { onSelect } });
		const input = screen.getByRole('combobox', { name: 'Τι ψάχνετε;' });
		const groups = screen.getAllByRole('group');
		expect(groups[0]).toHaveAccessibleName('Ειδικότητες');
		expect(groups[1]).toHaveAccessibleName('Γιατροί');
		input.focus();
		await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
		const maria = screen.getByRole('option', { name: /Μαρία Καρδαμίτση/ });
		expect(input).toHaveAttribute('aria-activedescendant', 'option-maria');
		expect(maria).toHaveAttribute('aria-selected', 'true');
		expect(input).toHaveFocus();
		await user.keyboard('{Enter}');
		expect(onSelect).toHaveBeenCalledWith('option-maria');
		expect(maria).toHaveAttribute('aria-checked', 'true');
		await user.click(screen.getByRole('option', { name: /Καρδιοχειρουργός/ }));
		expect(onSelect).toHaveBeenLastCalledWith('option-cardiac-surgery');
		// MINOR-2 of the R1 (dyad 4): the press picks the row and the field keeps the focus (precedent `combobox`).
		expect(input).toHaveFocus();
	});

	it('U-03.1 (MINOR-2, negative): a pressed `option` row refuses the focus — its mousedown is prevented', async () => {
		render(OptionRow, {
			props: { accessibilityRole: 'option', id: 'option-athens', label: 'Αθήνα', isSelected: false }
		});
		const row = screen.getByRole('option', { name: 'Αθήνα' });
		expect(await fireEvent.mouseDown(row)).toBe(false);
	});

	it('U-03.1 (from the application, risk α of the R1): the name is the label alone; the muted line and the count describe it', () => {
		for (const accessibilityRole of ['button', 'radio', 'option'] as const) {
			const view = render(OptionRow, {
				props: {
					accessibilityRole,
					label: 'Μαρία Παπαδοπούλου',
					supportingLabel: 'Παθολόγος · Αθήνα',
					count: '12',
					query: 'μαρ',
					isSelected: false
				}
			});
			const row = view.getByRole(accessibilityRole, { name: 'Μαρία Παπαδοπούλου' });
			expect(row).toHaveAccessibleDescription('Παθολόγος · Αθήνα 12');
			view.unmount();
		}
		render(OptionRow, { props: { label: 'Αθήνα', isSelected: false } });
		expect(screen.getByRole('button', { name: 'Αθήνα' })).not.toHaveAttribute('aria-describedby');
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', () => {
		const { container } = render(OptionRow, {
			props: { label: 'Αθήνα', icon: 'location-outline', isSelected: true, bordered: true }
		});
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});

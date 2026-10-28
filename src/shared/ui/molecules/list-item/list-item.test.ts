import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './list-item.harness.svelte';

const rowOf = () => screen.getByTestId('doctor-row');

describe('ListItem', () => {
	it('U-09.4: the application’s row — 48 high, 12 apart, the medium title over the two-line muted subtitle', () => {
		render(Harness, { props: { withSlots: true, subtitle: 'Καρδιολόγος · Αθήνα' } });
		const row = rowOf();
		expect(row.tagName).toBe('DIV');
		expect(row).toHaveClass(
			'flex',
			'min-h-touch',
			'w-full',
			'flex-row',
			'items-center',
			'gap-3',
			'px-4',
			'py-3'
		);
		expect(screen.getByText('Δρ. Μαρία Παπαδοπούλου')).toHaveClass(
			'line-clamp-1',
			'text-body-md',
			'font-medium',
			'text-foreground'
		);
		expect(screen.getByText('Καρδιολόγος · Αθήνα')).toHaveClass(
			'line-clamp-2',
			'text-body-sm',
			'text-muted-foreground'
		);
		expect(screen.getByTestId('leading').parentElement).toHaveClass('shrink-0');
		expect(screen.getByTestId('trailing').parentElement).toHaveClass('shrink-0');
		const content = row.querySelector('[data-slot="list-item-content"]');
		expect(content).toHaveClass('min-w-0', 'flex-1', 'gap-0.5');
	});

	it('U-09.4: with `onclick` it is one button named by its words; the keyboard ring only, no pressed look', async () => {
		const user = userEvent.setup();
		const onclick = vi.fn();
		render(Harness, { props: { onclick } });
		const button = screen.getByRole('button', { name: /Δρ. Μαρία Παπαδοπούλου/ });
		expect(button).toBe(rowOf());
		expect(button).toHaveAttribute('type', 'button');
		expect(button).toHaveClass('text-left', 'focus-visible:ring-3', 'focus-visible:ring-inset');
		expect(button.className).not.toMatch(/(^|\s)(hover|active):/);
		await user.click(button);
		await user.keyboard('{Enter}');
		expect(onclick).toHaveBeenCalledTimes(2);
	});

	it('U-09.4: disabled dims the row and refuses the press', async () => {
		const user = userEvent.setup();
		const onclick = vi.fn();
		render(Harness, { props: { onclick, disabled: true } });
		expect(rowOf()).toBeDisabled();
		expect(rowOf()).toHaveClass('opacity-50');
		await user.click(rowOf());
		expect(onclick).not.toHaveBeenCalled();
	});

	it('U-09.4: a query bolds the matched part (Greek accents folded); the primary tone is the one title colour', () => {
		render(Harness, { props: { query: 'μαρια', titleTone: 'primary' } });
		const bold = rowOf().querySelector('.font-bold');
		expect(bold?.textContent).toBe('Μαρία');
		const title = rowOf().querySelector('[data-slot="list-item-content"]')?.firstElementChild;
		expect(title).toHaveClass('text-primary-text');
		expect(title).not.toHaveClass('text-foreground');
	});

	it('U-09.4 (negative): no subtitle, leading or trailing draws nothing in their place', () => {
		render(Harness);
		expect(rowOf().querySelector('[data-slot="list-item-subtitle"]')).toBeNull();
		expect(rowOf().querySelector('[data-slot="list-item-leading"]')).toBeNull();
		expect(rowOf().querySelector('[data-slot="list-item-trailing"]')).toBeNull();
	});
});

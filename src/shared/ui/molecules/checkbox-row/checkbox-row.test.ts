import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { step } from '$shared/design/tokens';
import CheckboxRow from './checkbox-row.svelte';

const boxOf = (row: HTMLElement) =>
	row.querySelector('[data-slot="checkbox-row-box"]') as HTMLElement;

describe('CheckboxRow', () => {
	it('U-03.1 (K4.6, M-38): the row is the checkbox — 48 tall, the 24 box in its 48 cell, 15 words, the muted count', () => {
		render(CheckboxRow, {
			props: { label: 'Ηλεκτροκαρδιογράφημα', count: '12', testId: 'search-filter-service-ecg' }
		});
		const row = screen.getByRole('checkbox', { name: 'Ηλεκτροκαρδιογράφημα' });
		expect(row).toHaveClass(
			'flex',
			'min-h-touch',
			'w-full',
			'flex-row',
			'items-center',
			'gap-3',
			'rounded-md',
			'px-1',
			'py-2'
		);
		expect(row).toHaveAttribute('aria-checked', 'false');
		expect(row).toHaveAttribute('data-testid', 'search-filter-service-ecg');
		expect(boxOf(row).parentElement).toHaveClass('size-touch', 'items-center', 'justify-center');
		expect(boxOf(row)).toHaveClass('size-6', 'rounded-sm', 'border', 'border-input', 'bg-card');
		expect(screen.getByText('Ηλεκτροκαρδιογράφημα')).toHaveClass(
			'line-clamp-1',
			'text-body-md',
			'text-foreground'
		);
		expect(screen.getByText('12')).toHaveClass('text-label-md', 'text-muted-foreground');
	});

	it('U-03.1 (K4.6): a press toggles it — the primary box with the «✓», the new state to `onToggle`', async () => {
		const user = userEvent.setup({ delay: null });
		const onToggle = vi.fn();
		render(CheckboxRow, { props: { label: 'Υπέρηχος', onToggle } });
		const row = screen.getByRole('checkbox', { name: 'Υπέρηχος' });
		await user.click(row);
		expect(onToggle).toHaveBeenLastCalledWith(true);
		expect(row).toHaveAttribute('aria-checked', 'true');
		expect(boxOf(row)).toHaveAttribute('data-state', 'checked');
		expect(boxOf(row)).toHaveClass(
			'data-[state=checked]:border-primary',
			'data-[state=checked]:bg-primary'
		);
		expect(boxOf(row)).toHaveTextContent('✓');
		await user.keyboard(' ');
		expect(onToggle).toHaveBeenLastCalledWith(false);
		expect(row).toHaveAttribute('aria-checked', 'false');
	});

	it("U-03.1 (from the application): a count of `''` is drawn, empty; only without one there is none", () => {
		const empty = render(CheckboxRow, { props: { label: 'Υπέρηχος', count: '' } });
		expect(empty.container.querySelector('[data-slot="checkbox-row-count"]')).toHaveTextContent(
			/^$/
		);
		empty.unmount();
		const none = render(CheckboxRow, { props: { label: 'Υπέρηχος' } });
		expect(none.container.querySelector('[data-slot="checkbox-row-count"]')).toBeNull();
	});

	it('U-03.1 (negative): without a count no count; disabled ⇒ refused, dimmed', async () => {
		const onToggle = vi.fn();
		const { container } = render(CheckboxRow, {
			props: { label: 'Υπέρηχος', disabled: true, onToggle }
		});
		expect(container.querySelectorAll('button > span')).toHaveLength(2);
		const row = screen.getByRole('checkbox');
		expect(row).toBeDisabled();
		expect(row).toHaveClass('disabled:opacity-50');
		await userEvent.setup({ delay: null }).click(row);
		expect(onToggle).not.toHaveBeenCalled();
	});

	it('U-03.1 (W-LIVE-2): in the accordion that clips its edges the ring is inset, in the row’s own padding (4 at the sides, 8 above and below ≥ the 3 ring)', () => {
		render(CheckboxRow, { props: { label: 'Υπέρηχος' } });
		const row = screen.getByRole('checkbox', { name: 'Υπέρηχος' });
		expect(row).toHaveClass('focus-visible:ring-3', 'focus-visible:ring-inset', 'px-1', 'py-2');
		expect(Math.min(step(1), step(2))).toBeGreaterThanOrEqual(3);
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', () => {
		const { container } = render(CheckboxRow, {
			props: { label: 'Υπέρηχος', count: '3', checked: true }
		});
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});

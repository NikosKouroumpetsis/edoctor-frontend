import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TimeSlotGrid from './time-slot-grid.svelte';

const SLOTS = [
	{ label: '09:00', value: '09:00' },
	{ label: '09:30', value: '09:30' },
	{ label: '10:00', value: '10:00' },
	{ label: '10:30', value: '10:30' },
	{ label: '11:00', value: '11:00' }
];
const PREFIX = 'availability';
const chip = (value: string) => screen.getByTestId(`${PREFIX}-slot-${value}`);

function renderGrid(props: Record<string, unknown> = {}) {
	const onChange = vi.fn();
	const view = render(TimeSlotGrid, {
		props: {
			slots: SLOTS,
			value: '09:30',
			onChange,
			emptyText: 'Καμία διαθέσιμη ώρα',
			testIdPrefix: PREFIX,
			'aria-label': 'Ώρες',
			...props
		}
	});
	return { onChange, ...view };
}

describe('TimeSlotGrid', () => {
	it('U-02.2 (K5.2): the application’s chips, class for class — the chosen one the solid primary (M-09)', () => {
		renderGrid();
		const base = [
			'flex',
			'min-h-touch',
			'w-full',
			'items-center',
			'justify-center',
			'rounded-md',
			'border',
			'px-2',
			'py-2'
		];
		expect(chip('09:30')).toHaveClass(...base, 'border-primary', 'bg-primary');
		expect(chip('09:00')).toHaveClass(...base, 'border-border/70', 'bg-card');
		expect(chip('09:00')).not.toHaveClass('bg-primary');
		expect(screen.getByText('09:30')).toHaveClass(
			'truncate',
			'text-label-lg',
			'font-medium',
			'text-primary-foreground'
		);
		expect(screen.getByText('09:00')).toHaveClass('text-primary-text');
		expect(screen.getByTestId(`${PREFIX}-times`)).toHaveClass('grid', 'gap-rail', 'grid-cols-4');
	});

	it('U-03.1 (zones): four columns by default at every width; a count per zone is whole classes from the phone up', () => {
		const first = renderGrid();
		expect(screen.getByTestId(`${PREFIX}-times`).className).not.toMatch(
			/\b(tablet|split|laptop|desktop|wide):/
		);
		first.unmount();
		renderGrid({ columns: { phone: 3, tablet: 4, laptop: 6 } });
		expect(screen.getByTestId(`${PREFIX}-times`)).toHaveClass(
			'grid-cols-3',
			'tablet:grid-cols-4',
			'laptop:grid-cols-6'
		);
	});

	it('U-03.1 (a11y): a named radio group of 48 chips, one Tab stop; a press and the arrows choose', async () => {
		const user = userEvent.setup({ delay: null });
		const { onChange } = renderGrid();
		const group = screen.getByRole('radiogroup', { name: 'Ώρες' });
		expect(screen.getAllByRole('radio')).toHaveLength(5);
		expect(screen.getByRole('radio', { name: '09:30' })).toHaveAttribute('aria-checked', 'true');
		expect(screen.getByRole('radio', { name: '09:30' })).toHaveAttribute('tabindex', '0');
		expect(screen.getByRole('radio', { name: '09:00' })).toHaveAttribute('tabindex', '-1');
		expect(group).toBe(screen.getByTestId(`${PREFIX}-times`));
		await user.click(screen.getByRole('radio', { name: '11:00' }));
		expect(onChange).toHaveBeenLastCalledWith('11:00');
		expect(screen.getByRole('radio', { name: '11:00' })).toHaveAttribute('aria-checked', 'true');
		await user.keyboard('{ArrowDown}');
		expect(onChange).toHaveBeenLastCalledWith('09:00');
		expect(screen.getByRole('radio', { name: '09:00' })).toHaveFocus();
		await user.keyboard('{ArrowLeft}');
		expect(onChange).toHaveBeenLastCalledWith('11:00');
	});

	it('U-03.1 (negative): nothing chosen ⇒ none checked and the first is the Tab stop', () => {
		renderGrid({ value: undefined });
		for (const radio of screen.getAllByRole('radio'))
			expect(radio).toHaveAttribute('aria-checked', 'false');
		expect(chip('09:00')).toHaveAttribute('tabindex', '0');
	});

	it('U-02.2 (negative): no time prints the caller’s line, muted, and no group', () => {
		renderGrid({ slots: [] });
		expect(screen.queryByRole('radiogroup')).toBeNull();
		const empty = screen.getByTestId(`${PREFIX}-empty`);
		expect(empty).toHaveTextContent('Καμία διαθέσιμη ώρα');
		expect(empty).toHaveClass('text-body-sm', 'text-muted-foreground');
	});

	it('U-03.1 (NIT-1, negative): a radio group needs its name (ARIA 1.2)', () => {
		// @ts-expect-error a radio group without a name
		const props: ComponentProps<typeof TimeSlotGrid> = { slots: SLOTS, emptyText: 'Καμία ώρα' };
		expect(props.slots).toBe(SLOTS);
	});

	it('U-03.13: the application’s ids from the prefix, none without it; only theme tokens (light/dark)', () => {
		const { container, unmount } = render(TimeSlotGrid, {
			props: { slots: SLOTS, emptyText: 'Καμία ώρα', 'aria-label': 'Ώρες' }
		});
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
		unmount();
		renderGrid();
		expect(chip('10:00')).toBeInTheDocument();
	});
});

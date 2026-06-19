import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { CalendarDate } from '@internationalized/date';
import Calendar from './calendar.svelte';

const june2026 = new CalendarDate(2026, 6, 15);

describe('Calendar', () => {
	it('renders the month heading for the active value', () => {
		render(Calendar, { props: { value: june2026, locale: 'en-US' } });
		expect(screen.getByText('June 2026')).toBeInTheDocument();
	});

	it('selects a day on click and reports the CalendarDate', async () => {
		const user = userEvent.setup({ delay: null });
		const onValueChange = vi.fn();
		const { container } = render(Calendar, { props: { value: june2026, onValueChange } });
		const day20 = container.querySelector<HTMLButtonElement>('[data-date="2026-06-20"]')!;
		await user.click(day20);
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange.mock.calls[0][0].toString()).toBe('2026-06-20');
		expect(day20).toHaveAttribute('data-selected');
	});

	it('navigates to the previous and next month', async () => {
		const user = userEvent.setup({ delay: null });
		render(Calendar, { props: { value: june2026, locale: 'en-US' } });
		await user.click(screen.getByRole('button', { name: 'Previous month' }));
		expect(screen.getByText('May 2026')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Next month' }));
		await user.click(screen.getByRole('button', { name: 'Next month' }));
		expect(screen.getByText('July 2026')).toBeInTheDocument();
	});

	it('disables days outside the min/max range', () => {
		const { container } = render(Calendar, {
			props: { value: june2026, minValue: new CalendarDate(2026, 6, 10) }
		});
		expect(container.querySelector('[data-date="2026-06-05"]')).toBeDisabled();
		expect(container.querySelector('[data-date="2026-06-20"]')).not.toBeDisabled();
	});
});

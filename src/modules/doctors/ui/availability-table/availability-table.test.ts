import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import AvailabilityTable from './availability-table.svelte';
import type { DaySlots } from '$modules/doctors/types';

const days: DaySlots[] = [
	{
		date: '2026-06-22',
		label: '22 Jun',
		weekday: 'Mon',
		slots: [
			{ time: '09:00', available: true },
			{ time: '09:30', available: false }
		]
	},
	{
		date: '2026-06-23',
		label: '23 Jun',
		weekday: 'Tue',
		slots: [{ time: '10:00', available: true }]
	}
];

describe('AvailabilityTable', () => {
	it('selects an available slot and reports it', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(AvailabilityTable, { props: { days, onSelect } });
		const slot = screen.getByRole('button', { name: '09:00' });
		await user.click(slot);
		expect(onSelect).toHaveBeenCalledWith('2026-06-22', '09:00');
		expect(slot).toHaveAttribute('aria-pressed', 'true');
	});

	it('disables unavailable slots', () => {
		render(AvailabilityTable, { props: { days } });
		expect(screen.getByRole('button', { name: '09:30' })).toBeDisabled();
	});

	it('wires week navigation and respects bounds', async () => {
		const user = userEvent.setup();
		const onPrev = vi.fn();
		const onNext = vi.fn();
		render(AvailabilityTable, { props: { days, onPrev, onNext, canPrev: false } });
		expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: 'Next week' }));
		expect(onNext).toHaveBeenCalledTimes(1);
	});
});

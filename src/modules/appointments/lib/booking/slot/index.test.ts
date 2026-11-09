import { describe, expect, it } from 'vitest';
import { findOfferedSlot, resolveSlotState } from '.';

const availability = {
	days: [
		{ date: '2026-11-08', slots: [{ startMinute: 570, startTime: '2026-11-08T07:30:00.000Z' }] },
		{ date: '2026-11-09', slots: [] }
	]
};
const slot = { officeId: 'o', date: '2026-11-08', startMinute: 570 };

describe('the chosen hour against the slots read (record §3.3)', () => {
	it('finds the offered slot by its office-local day and minute: its instant is the identity sent', () => {
		expect(findOfferedSlot(availability, slot)?.startTime).toBe('2026-11-08T07:30:00.000Z');
		expect(findOfferedSlot(availability, { date: '2026-11-08', startMinute: 600 })).toBeNull();
		expect(findOfferedSlot(undefined, slot)).toBeNull();
	});

	it('app = web (isSlotStillOffered): offered; waiting while nothing answered; gone after another service’s length; gone otherwise', () => {
		expect(resolveSlotState({ availability, slot, serviceChanged: false })).toBe('offered');
		expect(resolveSlotState({ availability: undefined, slot, serviceChanged: true })).toBe(
			'waiting'
		);
		const moved = { ...slot, startMinute: 600 };
		expect(resolveSlotState({ availability, slot: moved, serviceChanged: true })).toBe(
			'gone-duration'
		);
		expect(resolveSlotState({ availability, slot: moved, serviceChanged: false })).toBe('gone');
		expect(resolveSlotState({ availability, slot: null, serviceChanged: false })).toBe('gone');
	});
});

import type { BookingAvailabilityFacts, BookingSlotFacts } from '$modules/appointments/types';
import type { BookingSlotChoice, BookingSlotState } from '../types';

/** The offered slot of the chosen office-local day and minute in the window just read, or `null`. */
export function findOfferedSlot(
	availability: BookingAvailabilityFacts | undefined,
	slot: Pick<BookingSlotChoice, 'date' | 'startMinute'> | null
): BookingSlotFacts | null {
	if (!availability || !slot) return null;
	const day = availability.days.find((candidate) => candidate.date === slot.date);
	return day?.slots.find((offered) => offered.startMinute === slot.startMinute) ?? null;
}

/**
 * 🔴 Where the chosen hour stands (record §3.3, the application's `isSlotStillOffered`): asked again after every service
 * change, because the grid is computed from the visit's LENGTH. Only an answered read may say «gone»: while it is in
 * flight the state is `waiting` and nothing is claimed. A hour that no longer fits the service picked after it is
 * `gone-duration` (its own sentence); one that is simply not offered is `gone`.
 */
export function resolveSlotState({
	availability,
	slot,
	serviceChanged
}: {
	availability: BookingAvailabilityFacts | undefined;
	slot: BookingSlotChoice | null;
	serviceChanged: boolean;
}): BookingSlotState {
	if (!slot) return 'gone';
	if (!availability) return 'waiting';
	if (findOfferedSlot(availability, slot)) return 'offered';
	return serviceChanged ? 'gone-duration' : 'gone';
}

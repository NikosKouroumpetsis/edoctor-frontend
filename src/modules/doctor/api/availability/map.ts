import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import type { AvailabilityPublicSlotsView, AvailabilitySlotView } from '$shared/lib/api-client';
import type {
	DoctorAvailabilityDayFacts,
	DoctorAvailabilitySlotFacts,
	DoctorOfficeAvailabilityFacts
} from './types';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const MINUTES_IN_DAY = 24 * 60;

/** One slot, or nothing: a minute outside its day or an instant that does not parse is dropped. */
function mapSlot(slot: AvailabilitySlotView | null | undefined): DoctorAvailabilitySlotFacts[] {
	const startMinute = slot?.startMinute;
	const startTime = slot?.startTime?.trim();
	if (typeof startMinute !== 'number' || !Number.isInteger(startMinute)) return [];
	if (startMinute < 0 || startMinute >= MINUTES_IN_DAY) return [];
	if (!startTime || Number.isNaN(Date.parse(startTime))) return [];
	return [{ startMinute, startTime }];
}

/**
 * One office's window as FACTS (the application's `mapDoctorOfficeAvailability`): days kept even when empty, slots in
 * time order, a day that is not `YYYY-MM-DD` dropped, the platform's zone when the answer has none.
 */
export function mapDoctorOfficeAvailability(
	data: AvailabilityPublicSlotsView
): DoctorOfficeAvailabilityFacts {
	const days: DoctorAvailabilityDayFacts[] = (data?.slotsByDate ?? []).flatMap((day) => {
		const date = day?.date?.trim();
		if (!date || !ISO_DATE_PATTERN.test(date)) return [];
		return [
			{
				date,
				slots: (day.slots ?? [])
					.flatMap(mapSlot)
					.sort((left, right) => left.startMinute - right.startMinute)
			}
		];
	});
	const mode = data?.policy?.confirmationMode;
	return {
		officeId: data?.officeId ?? '',
		timezone: data?.timezone?.trim() || PLATFORM_TIME_ZONE,
		days,
		...(mode === 'AUTO' || mode === 'MANUAL' ? { confirmationMode: mode } : {})
	};
}

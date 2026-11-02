import { queryOptions } from '@tanstack/svelte-query';
import { doctorQueryKeys } from '$modules/doctor/api/profile';
import { getDoctorPublicAvailabilitySlots } from './endpoints';
import { mapDoctorOfficeAvailability } from './map';
import type { DoctorAvailabilitySlotsRequest } from './types';

/**
 * 🔴 U-37.1 (app = web): the window the profile reads, per office, ONCE — 4 weeks (28 days, the application's
 * `DOCTOR_AVAILABILITY_WINDOW_DAYS`), never further: the section, the card, the bar and the window share it.
 */
export const DOCTOR_AVAILABILITY_WINDOW_DAYS = 28;

/** One office's window, keyed by everything its answer depends on (no language: it carries no words). */
export const doctorAvailabilityQueryKeys = {
	all: [...doctorQueryKeys.all, 'availability-slots'] as const,
	slots: (request: DoctorAvailabilitySlotsRequest) =>
		[
			...doctorAvailabilityQueryKeys.all,
			request.doctorId,
			request.officeId,
			request.doctorServiceId,
			request.days
		] as const
};

/** One office's window as a TanStack read (the page and the window derive the SAME key: one read). */
export function doctorAvailabilitySlotsQuery(request: DoctorAvailabilitySlotsRequest) {
	return queryOptions({
		queryKey: doctorAvailabilityQueryKeys.slots(request),
		queryFn: async ({ signal }) =>
			mapDoctorOfficeAvailability(await getDoctorPublicAvailabilitySlots(request, { signal }))
	});
}

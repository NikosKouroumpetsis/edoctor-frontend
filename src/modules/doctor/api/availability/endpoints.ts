import { httpGet } from '$shared/lib/http';
import type { AvailabilityPublicSlotsView } from '$shared/lib/api-client';
import type { DoctorRequestContext } from '$modules/doctor/api/profile';
import type { DoctorAvailabilitySlotsRequest } from './types';

/**
 * One office's bookable slots for one service over a window (`GET /availability/public/slots`, the application's
 * `getDoctorPublicAvailabilitySlots`): anonymous; no `date` travels, the server opens the window on its own today
 * (D-118).
 */
export function getDoctorPublicAvailabilitySlots(
	request: DoctorAvailabilitySlotsRequest,
	context: DoctorRequestContext = {}
): Promise<AvailabilityPublicSlotsView> {
	return httpGet<AvailabilityPublicSlotsView>('/availability/public/slots', {
		params: {
			days: request.days,
			doctorId: request.doctorId,
			doctorServiceId: request.doctorServiceId,
			officeId: request.officeId
		},
		signal: context.signal,
		fetch: context.fetch
	});
}

import type { BookingReadinessView } from '$shared/lib/api-client';
import { httpSessionGet } from '$shared/lib/http';
import type { BookingReadinessRequest } from './types';

/**
 * The readiness of a booking (`GET /appointment/booking-readiness`), with the cookies: the contract's view, wave 3's
 * `firstVisitKnown` and `patientSmsExpected` included (A-1, A-3). `map.ts` still reads each flag as it comes.
 */
export function getBookingReadiness(
	request: BookingReadinessRequest,
	signal?: AbortSignal
): Promise<BookingReadinessView> {
	return httpSessionGet<BookingReadinessView>('/appointment/booking-readiness', {
		params: {
			doctorId: request.doctorId,
			officeId: request.slot?.officeId,
			startTime: request.slot?.startTime,
			relativeId: request.relativeId ?? undefined
		},
		signal
	});
}

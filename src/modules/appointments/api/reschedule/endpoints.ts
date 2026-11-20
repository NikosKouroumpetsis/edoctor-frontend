import { httpSessionGet } from '$shared/lib/http';
import { mapAppointmentRescheduleSlots } from './map';
import type { AppointmentRescheduleSlotsFacts, AppointmentRescheduleSlotsView } from './types';

const one = (appointmentId: string) =>
	`/appointment/appointments/${encodeURIComponent(appointmentId)}/reschedule-slots`;

/**
 * 🔴 D-W52-75α (`w52-b7` §Γ3.5): the free hours to move ONE appointment of the person to (`GET …/reschedule-slots`,
 * with the cookies, `no-store`) — `days` (1 to 7) from `date` (the server's «today» without one). The appointment alone
 * names the doctor, the office and the length; another person's, an unknown or a closed one is refused (403, D-107).
 */
export async function getAppointmentRescheduleSlots(
	appointmentId: string,
	window: { date?: string; days: number },
	signal?: AbortSignal
): Promise<AppointmentRescheduleSlotsFacts> {
	const params = { ...(window.date ? { date: window.date } : {}), days: window.days };
	return mapAppointmentRescheduleSlots(
		await httpSessionGet<AppointmentRescheduleSlotsView>(one(appointmentId), { params, signal })
	);
}

import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import type { AppointmentDetailResponseView } from '$shared/lib/api-client';
import type { AppointmentFacts, AppointmentSnapshotFacts } from './types';

// W-4: a text only when it is one (an id sent as a number by a broken answer reads as none, never a throw).
const text = (value: unknown): string | null =>
	typeof value === 'string' ? value.trim() || null : null;
const finite = (value: unknown): number | null =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;
const fullName = (first: string | null | undefined, last: string | null | undefined) =>
	[text(first), text(last)].filter(Boolean).join(' ') || null;
/** The lines when they are a list, else none (review w3-w6 R2 NIT-1: `{}` or a `null` line never throws). */
const linesOf = (view: AppointmentDetailResponseView) =>
	Array.isArray(view.serviceLines) ? view.serviceLines : [];

/** What the appointment froze (D-06): the visitor's names, the first active line's title and length, the cost. */
function mapSnapshot(view: AppointmentDetailResponseView): AppointmentSnapshotFacts {
	const relative = view.bookedForType === 'RELATIVE' || Boolean(text(view.relativeId));
	const line = linesOf(view).find((entry) => entry?.isActive === true);
	const title = text(line?.serviceTitleSnapshot);
	return {
		visitor: relative
			? {
					kind: 'relative',
					name: fullName(view.relativeSnapshot?.firstName, view.relativeSnapshot?.lastName)
				}
			: {
					kind: 'self',
					name: fullName(view.patientSnapshot?.firstName, view.patientSnapshot?.lastName)
				},
		service: title
			? {
					title,
					durationInMinutes:
						finite(line?.durationInMinutesSnapshot) ?? finite(view.effectiveDurationInMinutes)
				}
			: null,
		totalAmount: finite(view.finalTotalAmount) ?? finite(view.quotedTotalAmount)
	};
}

/**
 * The appointment as FACTS: the instants as the server sent them, the office's zone (the platform's when it names
 * none), the services of the active lines. `null` for an answer with no id, doctor or office as text: nothing on the
 * page may claim a booking the server did not name.
 */
export function mapAppointment(view: AppointmentDetailResponseView): AppointmentFacts | null {
	const id = text(view?.id);
	const doctorId = text(view?.doctorId);
	const officeId = text(view?.officeId);
	if (!view || !id || !doctorId || !officeId) return null;
	return {
		id,
		doctorId,
		officeId,
		officeTimeZone: text(view.officeTimeZone) ?? PLATFORM_TIME_ZONE,
		status: view.status,
		confirmationMode: view.confirmationModeSnapshot ?? null,
		startTime: view.startTime,
		expiresAt: text(view.expiresAt),
		officePhone: text(view.officePhone),
		patientNote: text(view.patientNote),
		relativeId: text(view.relativeId),
		serviceIds: linesOf(view).flatMap((line) => {
			const serviceId = line?.isActive === true ? text(line.doctorServiceId) : null;
			return serviceId ? [serviceId] : [];
		}),
		snapshot: mapSnapshot(view)
	};
}

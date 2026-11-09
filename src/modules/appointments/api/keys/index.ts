/**
 * The booking's reads in TanStack's cache, under ONE root (the application's `appointmentsQueryKeys`): the person's own
 * facts, the readiness of a booking and one appointment. Every one of them is personal: a sign-out removes them all
 * (`personalQueryMeta`).
 */
export const appointmentsQueryKeys = {
	all: ['appointments'] as const,
	patient: () => [...appointmentsQueryKeys.all, 'patient'] as const,
	readiness: (request: {
		doctorId: string;
		officeId: string | null;
		startTime: string | null;
		relativeId: string | null;
	}) =>
		[
			...appointmentsQueryKeys.all,
			'readiness',
			request.doctorId,
			request.officeId,
			request.startTime,
			request.relativeId
		] as const,
	detail: (appointmentId: string) =>
		[...appointmentsQueryKeys.all, 'detail', appointmentId] as const
};

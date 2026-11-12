/**
 * The module's reads in TanStack's cache, under ONE root (the application's `appointmentsQueryKeys`): the person's own
 * facts, the readiness of a booking, one appointment, and since wave 4.0 the list's tabs, the scan of the upcoming
 * (D-W4-21), the rating's invitation and review, the relatives. Every one of them is personal: a sign-out removes them
 * all (`personalQueryMeta`), and a write invalidates `all` or its own branch.
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
		[...appointmentsQueryKeys.all, 'detail', appointmentId] as const,
	/** Every list of the person: a write invalidates them together (an appointment moves between the tabs). */
	lists: () => [...appointmentsQueryKeys.all, 'list'] as const,
	list: (scope: 'upcoming' | 'history') => [...appointmentsQueryKeys.lists(), scope] as const,
	/** D-W4-21: the ONE read of the upcoming the relative's deletion asks (`limit=100`). */
	upcomingScan: () => [...appointmentsQueryKeys.lists(), 'upcoming-scan'] as const,
	invitation: (invitationId: string) =>
		[...appointmentsQueryKeys.all, 'rating-invitation', invitationId] as const,
	/** The person's own review, by the `ratingId` of its appointment (P-B4 §13.3.5). */
	reviews: () => [...appointmentsQueryKeys.all, 'review'] as const,
	review: (ratingId: string) => [...appointmentsQueryKeys.reviews(), ratingId] as const,
	relatives: (patientId: string) => [...appointmentsQueryKeys.all, 'relatives', patientId] as const
};

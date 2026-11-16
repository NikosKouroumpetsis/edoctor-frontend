import type { ApiResponseData } from '$shared/lib/api-client';
import { mapDoctorAppointment, mapDoctorAppointmentDetail } from './map';
import type { DoctorAppointmentDetailFacts, DoctorAppointmentFacts } from './types';

/*
 * Tests only · screen 66's day as the prototype draws it (`64-switch/sw.js:224-251`): Saturday 14 November 2026, now
 * 12:40 in Athens (10:40 UTC, winter time). Made-up people (the prototype's names), a made-up office; ids are uuid-like.
 */

type Row = ApiResponseData<'listAppointments', 200>['items'][number];

/** The prototype's «now»: Saturday 14 November 2026, 12:40 Athens. */
export const TODAY_NOW = Date.parse('2026-11-14T10:40:00.000Z');

const NO_ACTIONS = {
	canCancel: false,
	canReschedule: false,
	canConfirm: false,
	canReject: false,
	outcomes: [] as string[],
	correction: null,
	cancellationCutoffHours: null,
	isPastCancellationCutoff: false,
	cancellationDeadline: null,
	rescheduleDenial: null,
	reschedulesLeft: null,
	canEditCharges: false
};

/** One row of the doctor's side of the list (`as=doctor`), a booked visit of 30 minutes at «Κηφισίας 120». */
export function doctorAppointmentRow(
	patch: Partial<Record<keyof Row, unknown>> & {
		actions?: Partial<typeof NO_ACTIONS> | null;
	} = {}
): Row {
	const startTime = (patch.startTime as string | undefined) ?? '2026-11-14T11:00:00.000Z';
	const base = {
		id: '0193d000-0000-7000-8000-000000000001',
		doctorId: '0193d000-0000-7000-8000-0000000000d1',
		officeId: '0193d000-0000-7000-8000-0000000000f1',
		patientId: '0193d000-0000-7000-8000-0000000000e1',
		officeTimeZone: 'Europe/Athens',
		status: 'booked',
		bookedForType: 'SELF',
		relativeId: null,
		startTime,
		endTime: new Date(Date.parse(startTime) + 30 * 60_000).toISOString(),
		effectiveDurationInMinutes: 30,
		expiresAt: null,
		unattendedOutcomeAt: null,
		patientNote: null,
		firstVisit: null,
		patientSnapshot: {
			id: '0193d000-0000-7000-8000-0000000000e1',
			tenantUserId: null,
			firstName: 'Αντώνης',
			lastName: 'Πέτρου',
			phoneE164: '306900000001'
		},
		relativeSnapshot: null,
		serviceLines: [
			{
				doctorServiceId: '0193d000-0000-7000-8000-0000000000a1',
				serviceTitleSnapshot: 'Επίσκεψη',
				durationInMinutesSnapshot: 30,
				isActive: true
			}
		],
		officeSnapshot: {
			id: '0193d000-0000-7000-8000-0000000000f1',
			postalCode: '11526',
			phone: null,
			city: 'Αθήνα',
			street: 'Κηφισίας',
			streetNumber: '120',
			state: null,
			floor: null,
			description: null,
			translations: [{ language: 'en', street: 'Kifisias', streetNumber: '120' }]
		},
		canceledBy: null,
		outcomeSource: null,
		...patch,
		actions: patch.actions === null ? undefined : { ...NO_ACTIONS, ...patch.actions }
	};
	return base as unknown as Row;
}

/** The same row as the page reads it. */
export function doctorAppointmentFacts(
	patch: Parameters<typeof doctorAppointmentRow>[0] = {}
): DoctorAppointmentFacts {
	const facts = mapDoctorAppointment(doctorAppointmentRow(patch));
	if (!facts) throw new Error('sample row unreadable');
	return facts;
}

const person = (firstName: string, lastName: string) => ({
	id: `patient-${lastName}`,
	tenantUserId: null,
	firstName,
	lastName,
	phoneE164: null
});

/** The prototype's day (`T`): two requests, two visits to answer, two next, two closed, three from tomorrow. */
export const TODAY_DAY = {
	r1: doctorAppointmentRow({
		id: 'r1',
		status: 'pending',
		startTime: '2026-11-14T15:30:00.000Z',
		expiresAt: '2026-11-14T14:30:00.000Z',
		bookedForType: 'RELATIVE',
		relativeId: 'rel-1',
		patientSnapshot: person('Ελένη', 'Μαυρίδη'),
		relativeSnapshot: {
			id: 'rel-1',
			firstName: 'Νίκος',
			lastName: 'Μαυρίδης',
			relationship: 'CHILD',
			phone: null,
			email: null,
			gender: 'MALE'
		},
		patientNote: 'Βήχας εδώ και μία εβδομάδα, χωρίς πυρετό.',
		actions: { canConfirm: true, canReject: true, canReschedule: true, canCancel: true }
	}),
	r2: doctorAppointmentRow({
		id: 'r2',
		status: 'pending',
		startTime: '2026-11-16T08:00:00.000Z',
		expiresAt: '2026-11-14T19:15:00.000Z',
		patientSnapshot: person('Γιώργος', 'Αντωνίου'),
		patientNote: 'Πόνος στο στήθος όταν ανεβαίνω σκάλες.',
		actions: { canConfirm: true, canReject: true, canReschedule: true, canCancel: true }
	}),
	o1: doctorAppointmentRow({
		id: 'o1',
		startTime: '2026-11-14T08:30:00.000Z',
		patientSnapshot: person('Δημήτρης', 'Ζαφειρίου'),
		unattendedOutcomeAt: '2026-11-15T09:00:00.000Z',
		actions: { canCancel: true, outcomes: ['ARRIVED', 'NO_SHOW', 'COMPLETED'] }
	}),
	o2: doctorAppointmentRow({
		id: 'o2',
		startTime: '2026-11-13T16:00:00.000Z',
		patientSnapshot: person('Κατερίνα', 'Λαμπράκη'),
		unattendedOutcomeAt: '2026-11-14T16:30:00.000Z',
		actions: { outcomes: ['ARRIVED', 'NO_SHOW', 'COMPLETED'] }
	}),
	n1: doctorAppointmentRow({
		id: 'n1',
		startTime: '2026-11-14T11:00:00.000Z',
		actions: { canCancel: true, canReschedule: true }
	}),
	n2: doctorAppointmentRow({
		id: 'n2',
		startTime: '2026-11-14T12:00:00.000Z',
		patientSnapshot: person('Βασιλική', 'Θεοδώρου')
	}),
	d1: doctorAppointmentRow({
		id: 'd1',
		status: 'completed',
		startTime: '2026-11-14T07:00:00.000Z',
		patientSnapshot: person('Σοφία', 'Ρήγα')
	}),
	d2: doctorAppointmentRow({
		id: 'd2',
		status: 'canceled',
		canceledBy: 'PATIENT',
		startTime: '2026-11-14T09:30:00.000Z',
		patientSnapshot: person('Μάρκος', 'Ηλιόπουλος')
	}),
	u2: doctorAppointmentRow({
		id: 'u2',
		startTime: '2026-11-16T09:00:00.000Z',
		patientSnapshot: person('Ιωάννα', 'Καρρά')
	}),
	u3: doctorAppointmentRow({
		id: 'u3',
		startTime: '2026-11-16T10:30:00.000Z',
		patientSnapshot: person('Παύλος', 'Μιχαηλίδης')
	}),
	u4: doctorAppointmentRow({
		id: 'u4',
		startTime: '2026-11-17T07:30:00.000Z',
		patientSnapshot: person('Ελένη', 'Σταύρου')
	})
};

type DetailView = ApiResponseData<'getAppointment', 200>;

/**
 * Tests only · screen 68 (`sw.js:358-394`, `AP.u2`): Ιωάννα Καρρά's kept visit of Monday 16 November, 11:00 Athens, at
 * «Πατησίων 45», 1st floor — WHOLE as the doctor reads it (U-182.7), its 4th visit, the patient's terms and a
 * conversation. Made-up people, numbers and ids.
 */
export function doctorAppointmentDetailRow(
	patch: Partial<Record<keyof DetailView, unknown>> & {
		actions?: Partial<typeof NO_ACTIONS> | null;
	} = {}
): DetailView {
	const startTime = (patch.startTime as string | undefined) ?? '2026-11-16T09:00:00.000Z';
	const row = doctorAppointmentRow({
		id: '0193d000-0000-7000-8000-0000000000a2',
		status: 'booked',
		startTime,
		endTime: new Date(Date.parse(startTime) + 20 * 60_000).toISOString(),
		effectiveDurationInMinutes: 20,
		confirmationModeSnapshot: 'MANUAL',
		confirmedAt: '2026-11-10T10:31:00.000Z',
		patientSnapshot: {
			id: '0193d000-0000-7000-8000-0000000000e2',
			tenantUserId: null,
			firstName: 'Ιωάννα',
			lastName: 'Καρρά',
			phoneE164: '306977654321',
			email: 'ioanna.karra@example.gr',
			amka: '23048501234',
			afm: '098765432'
		},
		patientNote: 'Θα φέρω τις εξετάσεις αίματος.',
		serviceLines: [
			{
				doctorServiceId: '0193d000-0000-7000-8000-0000000000a3',
				serviceTitleSnapshot: 'Επανέλεγχος',
				durationInMinutesSnapshot: 20,
				lineGrossAmount: 45,
				isActive: true
			}
		],
		quotedTotalAmount: 45,
		finalTotalAmount: 45,
		officeSnapshot: {
			id: '0193d000-0000-7000-8000-0000000000f2',
			postalCode: '10433',
			phone: '2103210101',
			city: 'Αθήνα',
			street: 'Πατησίων',
			streetNumber: '45',
			state: null,
			floor: 1,
			description: null,
			translations: [
				{
					language: 'en',
					street: 'Patision',
					streetNumber: '45',
					city: 'Athens',
					state: '',
					floor: 1
				}
			]
		},
		auditLogs: [
			{
				id: 'l1',
				appointmentId: '0193d000-0000-7000-8000-0000000000a2',
				action: 'CREATED',
				actorRole: 'MEMBER',
				actorUserId: null,
				reason: null,
				beforeSnapshot: null,
				afterSnapshot: { status: 'pending', startTime },
				createdAt: '2026-11-10T10:04:00.000Z'
			},
			{
				id: 'l2',
				appointmentId: '0193d000-0000-7000-8000-0000000000a2',
				action: 'CONFIRMED',
				actorRole: 'DOCTOR',
				actorUserId: null,
				reason: null,
				beforeSnapshot: { status: 'pending', startTime },
				afterSnapshot: { status: 'booked', startTime },
				createdAt: '2026-11-10T10:31:00.000Z'
			}
		],
		officePhone: '2103210101',
		visitsWithDoctor: { count: 3, lastAt: '2026-10-22T08:00:00.000Z' },
		patientCancellation: { cutoffHours: 8, deadline: '2026-11-16T01:00:00.000Z' },
		conversationId: '0193d000-0000-7000-8000-0000000000c1',
		...patch,
		actions: { canCancel: true, canReschedule: true, ...(patch.actions ?? {}) }
	});
	return row as unknown as DetailView;
}

/** The same appointment as screen 68 reads it. */
export function doctorAppointmentDetailFacts(
	patch: Parameters<typeof doctorAppointmentDetailRow>[0] = {}
): DoctorAppointmentDetailFacts {
	const facts = mapDoctorAppointmentDetail(doctorAppointmentDetailRow(patch));
	if (!facts) throw new Error('sample detail unreadable');
	return facts;
}

/** `AP.r1`: Νίκος Μαυρίδης's request (17:30 today) booked by his mother Ελένη — the relative and the holder apart. */
export function doctorRequestForRelativeRow(): DetailView {
	return doctorAppointmentDetailRow({
		id: '0193d000-0000-7000-8000-0000000000a1',
		status: 'pending',
		startTime: '2026-11-14T15:30:00.000Z',
		effectiveDurationInMinutes: 30,
		expiresAt: '2026-11-14T14:30:00.000Z',
		confirmedAt: null,
		bookedForType: 'RELATIVE',
		relativeId: 'rel-1',
		patientSnapshot: {
			id: 'holder-mavridi',
			tenantUserId: null,
			firstName: 'Ελένη',
			lastName: 'Μαυρίδη',
			phoneE164: '306941234567',
			email: 'eleni.mavridi@example.gr',
			amka: '12057801234',
			afm: '123456789'
		},
		relativeSnapshot: {
			id: 'rel-1',
			firstName: 'Νίκος',
			lastName: 'Μαυρίδης',
			relationship: 'CHILD',
			phone: null,
			email: null,
			amka: '01021512345',
			gender: 'MALE'
		},
		patientNote: 'Βήχας εδώ και μία εβδομάδα, χωρίς πυρετό.',
		serviceLines: [
			{
				doctorServiceId: 's-visit',
				serviceTitleSnapshot: 'Επίσκεψη',
				durationInMinutesSnapshot: 30,
				lineGrossAmount: 60,
				isActive: true
			}
		],
		quotedTotalAmount: 60,
		finalTotalAmount: 60,
		auditLogs: [
			{
				id: 'l1',
				appointmentId: '0193d000-0000-7000-8000-0000000000a1',
				action: 'CREATED',
				actorRole: 'MEMBER',
				actorUserId: null,
				reason: null,
				beforeSnapshot: null,
				afterSnapshot: { status: 'pending' },
				createdAt: '2026-11-13T14:30:00.000Z'
			}
		],
		visitsWithDoctor: { count: 0, lastAt: null },
		patientCancellation: { cutoffHours: 8, deadline: '2026-11-14T15:30:00.000Z' },
		conversationId: null,
		actions: { canConfirm: true, canReject: true, canReschedule: true, canCancel: true }
	});
}

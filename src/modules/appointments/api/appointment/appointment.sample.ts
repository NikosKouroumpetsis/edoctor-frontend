import type { AppointmentActionsFacts, AppointmentDetailFacts, AppointmentFacts } from './types';

/*
 * Tests' fixtures of wave 4.0 (P-B4 §13.2, the prototypes' appointments): made-up people and offices — no person's
 * data. A kept visit on Thursday 12 November 12:30 Athens (10:30 UTC), 24 hours' cutoff, no move made yet.
 */

export const appointmentFactsSample: AppointmentFacts = {
	id: '0193a1b2-0000-7000-8000-0000000000a1',
	doctorId: 'doc-maria',
	officeId: 'off-ermou',
	officeTimeZone: 'Europe/Athens',
	status: 'booked',
	confirmationMode: 'AUTO',
	startTime: '2026-11-12T10:30:00.000Z',
	endTime: '2026-11-12T11:00:00.000Z',
	durationInMinutes: 30,
	expiresAt: null,
	officePhone: '+302103210101',
	patientNote: 'Έχω μαζί μου τις εξετάσεις του Σεπτεμβρίου.',
	firstVisit: null,
	relativeId: null,
	serviceIds: ['svc-simple'],
	snapshot: {
		visitor: { kind: 'self', name: 'Ελένη Παππά' },
		service: { title: 'Απλή επίσκεψη', durationInMinutes: 30 },
		totalAmount: 140
	},
	serviceLines: [
		{
			doctorServiceId: 'svc-simple',
			title: 'Απλή επίσκεψη',
			durationInMinutes: 30,
			amount: 140,
			isActive: true
		}
	],
	office: {
		officeId: 'off-ermou',
		street: 'Ερμού',
		streetNumber: '101',
		city: 'Αθήνα',
		postalCode: '10555',
		state: 'Αττική',
		floor: 2,
		phone: '+302103210101',
		translations: [
			{
				language: 'en',
				street: 'Ermou',
				streetNumber: '101',
				city: 'Athens',
				state: 'Attica',
				floor: 2
			}
		]
	},
	relative: null,
	patientHasEmail: true,
	confirmedAt: '2026-11-01T09:00:00.000Z',
	canceledAt: null,
	canceledBy: null,
	cancelReasonCode: null,
	cancelReasonText: null,
	rejectedAt: null,
	rejectedBy: null,
	rejectReasonText: null,
	updatedAt: '2026-11-01T09:00:00.000Z',
	auditTrail: [],
	ratingInvitation: null,
	ratingId: null
};

/** P-B4 §13.2's first example: cancel and move allowed, the deadline Wednesday 11 November 12:30, two moves left. */
export const appointmentActionsSample: AppointmentActionsFacts = {
	canCancel: true,
	canReschedule: true,
	cancellationCutoffHours: 24,
	isPastCancellationCutoff: false,
	cancellationDeadline: '2026-11-11T10:30:00.000Z',
	rescheduleDenial: null,
	reschedulesLeft: 2
};

export const appointmentDetailSample: AppointmentDetailFacts = {
	...appointmentFactsSample,
	actions: appointmentActionsSample
};

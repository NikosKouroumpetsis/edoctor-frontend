import type { BookingPatientFacts } from '$modules/appointments/api/patient';
import type { BookingReadinessFacts } from '$modules/appointments/api/readiness';
import type { BookingAvailabilityFacts, BookingDoctorFacts } from '$modules/appointments/types';

/**
 * The booking's tests' doctor and person (made-up names, the prototype's numbers: Ερμού 101, 140 €, 24 / 4 hours): one
 * doctor with two offices and three services, a person with a verified mobile and one relative.
 */
export const bookingDoctorSample: BookingDoctorFacts = {
	doctorId: 'doc-1',
	doctorSlug: 'maria-triantafyllou',
	name: 'Μαρία Τριανταφύλλου',
	professional: { name: 'Δερματολόγος' },
	images: [{ url: 'https://cdn.test/p.jpg', thumbUrl: 'https://cdn.test/p-s.jpg' }],
	rating: 4.9,
	reviewCount: 22,
	pricingVisible: true,
	services: [
		{
			id: 'svc-simple',
			title: 'Απλή επίσκεψη',
			priceRange: { min: 140, max: 140 },
			durationInMinutes: 30
		},
		{
			id: 'svc-full',
			title: 'Πλήρης έλεγχος',
			priceRange: { min: 40, max: 60 },
			durationInMinutes: 60
		},
		{ id: 'svc-free', title: 'Επανεξέταση', priceRange: null }
	],
	offices: [
		{
			officeId: 'off-a',
			street: 'Ερμού',
			streetNumber: '101',
			city: 'Αθήνα',
			state: 'Αττική',
			bookingPolicy: {
				confirmationMode: 'MANUAL',
				cancellationCutoffHours: 24,
				minBookingNoticeHours: 4
			}
		},
		{
			officeId: 'off-b',
			street: 'Κηφισίας',
			streetNumber: '102',
			city: 'Μαρούσι',
			state: 'Αττική',
			bookingPolicy: {
				confirmationMode: 'AUTO',
				cancellationCutoffHours: 24,
				minBookingNoticeHours: 4
			}
		}
	]
};

export const bookingPatientSample: BookingPatientFacts = {
	patientId: 'pat-1',
	firstName: 'Ελένη',
	lastName: 'Παππά',
	phoneVerified: true,
	phoneMasked: '+30 69•• ••• 412',
	relatives: [
		{
			relativeId: 'rel-1',
			firstName: 'Πέτρος',
			lastName: 'Μάρκου',
			relationship: 'CHILD',
			gender: 'MALE'
		}
	]
};

export const bookingReadinessSample: BookingReadinessFacts = {
	phoneVerified: true,
	nameComplete: true,
	dateOfBirthPresent: true,
	blockers: [],
	insideCancellationCutoff: false,
	firstVisitKnown: true,
	patientSmsExpected: false
};

/** Sunday 8 November 2026, 09:00 and 09:30 at the first office (the instants on the Greek clock, UTC+2). */
export const bookingAvailabilitySample: BookingAvailabilityFacts = {
	days: [
		{
			date: '2026-11-08',
			slots: [
				{ startMinute: 540, startTime: '2026-11-08T07:00:00.000Z' },
				{ startMinute: 570, startTime: '2026-11-08T07:30:00.000Z' }
			]
		},
		{ date: '2026-11-09', slots: [] }
	]
};

export const bookingSlotSample = { officeId: 'off-a', date: '2026-11-08', startMinute: 570 };

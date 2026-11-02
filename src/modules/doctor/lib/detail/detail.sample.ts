import type { DoctorOfficeAvailabilityFacts } from '$modules/doctor/api/availability';
import type { DoctorProfile } from '$modules/doctor/api/profile';

/**
 * Tests only: one doctor's FACTS as the api maps them (Athena of the prototype, two offices, three services) and
 * the windows of 28 days the slots endpoint answers. Never imported by production code; no network, no person's data
 * (made-up names, the prototype's own).
 */

/** Saturday 31 October 2026, 12:00 in Athens: the clock of every sample. */
export const SAMPLE_NOW = Date.parse('2026-10-31T12:00:00+02:00');

export function sampleDoctorProfile(overrides: Partial<DoctorProfile> = {}): DoctorProfile {
	return {
		doctorId: 'doc-1',
		doctorSlug: 'dr-athena-papadopoulou',
		name: 'Αθηνά Παπαδοπούλου',
		professional: { id: 'pro-1', name: 'Παθολόγος', slug: 'pathologos' },
		images: [1, 2, 3].map((index) => ({
			id: `img-${index}`,
			url: `https://media.example/m/${index}.jpg`,
			largeUrl: `https://media.example/l/${index}.jpg`,
			thumbUrl: `https://media.example/s/${index}.jpg`
		})),
		rating: 4.9,
		reviewCount: 184,
		reviewSummary: { count: 184, score: 4.9 },
		reviewChips: [
			{ id: 'trust', score: 4.9 },
			{ id: 'punctuality', score: 4.7 }
		],
		reviewSnippets: [
			{
				id: 'rev-1',
				body: 'Πολύ προσεκτική και ευγενική.',
				patientName: 'Μαρία Κ.',
				patientInitial: 'Μ',
				publishedAt: '2026-09-12T10:00:00Z',
				rating: 5
			}
		],
		pricingVisible: false,
		fee: { min: 40, max: 40 },
		services: [
			{
				id: 'svc-1',
				title: 'Simple visit',
				priceRange: { min: 40, max: 40 },
				isSpecialized: true
			},
			{
				id: 'svc-2',
				title: 'Chronic follow-up',
				priceRange: { min: 60, max: 60 },
				note: 'Παρακολούθηση χρόνιων νοσημάτων.',
				isSpecialized: true
			},
			{ id: 'svc-3', title: 'Vaccination', priceRange: { min: 25, max: 25 }, isSpecialized: false }
		],
		office: {
			officeId: 'off-1',
			city: 'Αθήνα',
			state: 'Αττική',
			street: 'Νίκης',
			streetNumber: '12',
			postalCode: '10557',
			phone: '2101234567',
			floor: 2,
			parking: true,
			disabilityAccess: true,
			paymentOptions: ['card', 'cash'],
			latitude: 37.975,
			longitude: 23.735,
			description: 'Κοντά στο Σύνταγμα.'
		},
		offices: [
			{ officeId: 'off-1', city: 'Αθήνα', state: 'Αττική', street: 'Νίκης', streetNumber: '12' },
			{ officeId: 'off-2', city: 'Αθήνα', state: 'Αττική', street: 'Ερμού', streetNumber: '81' }
		],
		description: {
			paragraphs: [
				'Παθολόγος με έμφαση στην πρόληψη.',
				'Συνεργάζεται με το νοσοκομείο Ευαγγελισμός.'
			]
		},
		bio: { studies: ['Ιατρική Σχολή ΕΚΠΑ'], workExperience: ['Ευαγγελισμός', 'Ιδιωτικό ιατρείο'] },
		languages: [
			{ slug: 'el', name: 'Greek' },
			{ slug: 'en', name: 'English' }
		],
		socialLinks: [{ id: 'website', url: 'https://athena.example' }],
		licenseNumber: '6052',
		licenseObtainedDate: '2013-06-01',
		memberSince: '2015-03-01',
		...overrides
	};
}

/** One office's 28 days from the sample's Saturday: `times` on the listed days (office-local minutes), none else. */
export function sampleAvailability(
	officeId: string,
	times: Record<string, number[]> = {}
): DoctorOfficeAvailabilityFacts {
	const start = Date.parse('2026-10-31T00:00:00Z');
	return {
		officeId,
		timezone: 'Europe/Athens',
		confirmationMode: 'MANUAL',
		days: Array.from({ length: 28 }, (_, index) => {
			const date = new Date(start + index * 86_400_000).toISOString().slice(0, 10);
			return {
				date,
				slots: (times[date] ?? []).map((minute) => ({
					startMinute: minute,
					startTime: `${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00+02:00`
				}))
			};
		})
	};
}

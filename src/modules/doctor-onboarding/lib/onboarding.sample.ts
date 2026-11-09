import type { DoctorOnboardingProgress } from '$modules/doctor-onboarding/api/progress';

/** A sign-up in progress as the server answers it (§5.1): made-up facts, no person's. */
export function doctorOnboardingProgressSample(
	overrides: Partial<DoctorOnboardingProgress> = {}
): DoctorOnboardingProgress {
	return {
		state: 'IN_PROGRESS',
		startedAt: '2026-11-07T08:00:00.000Z',
		deleteAfter: '2027-02-07T08:00:00.000Z',
		completedAt: null,
		missing: ['BASIC_INFO', 'PROFESSIONAL', 'OFFICE_ADDRESS', 'OFFICE_PHONE'],
		basicInfo: { firstName: 'Μαρία', lastName: 'Τριανταφύλλου', dateOfBirth: null, gender: null },
		contactEmail: { notificationEmail: 'dr@example.test', verified: true },
		professional: { professionalId: null, licenseNumber: null, licenseObtainedDate: null },
		office: null,
		servicePricing: { price: null, customDurationInMinutes: null },
		calendar: { category: null },
		liability: {
			liabilityInsurance: null,
			liabilityCompany: null,
			liabilityInsuranceExpiresAt: null
		},
		terms: { accepted: false, version: '1.0' },
		activationIntent: null,
		salesContact: null,
		...overrides
	};
}

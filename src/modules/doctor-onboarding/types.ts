import type {
	DoctorOnboardingCalendarCategory,
	DoctorOnboardingGender,
	DoctorOnboardingParkingKind,
	DoctorOnboardingPaymentOption
} from '$modules/doctor-onboarding/api/progress';

/**
 * W-4: the sign-up's enums are the contract's (sex, parking kinds, the five ways to pay of U-111.2, the calendar), named
 * once in `api/progress` from the generated types, so the screens and the server never drift apart.
 */
export type {
	DoctorOnboardingCalendarCategory,
	DoctorOnboardingGender,
	DoctorOnboardingParkingKind,
	DoctorOnboardingPaymentOption
};

/**
 * Where the office's address came from, on this page only (the server takes `externalPlace`, never this, P-B3 review
 * B-3): a suggestion of Google's, the person's own typing, or the browser's position for the pin alone (D-W3-12).
 */
export type DoctorOnboardingAddressSource = 'google' | 'manual' | 'device';

/**
 * 🔴 U-112.2: what a person may change on the sign-up's screens, part by part, under the names of the server's progress
 * and of the bodies it takes (P-B3 review §3.6, §5.1: «edits ?? progress» one to one). The values as the screens hold
 * them: a text as typed (the price too), a date `YYYY-MM-DD`, the floor a number.
 */
export type DoctorOnboardingDraftFields = {
	basicInfo: {
		firstName: string;
		lastName: string;
		dateOfBirth: string;
		gender: DoctorOnboardingGender;
	};
	contactEmail: { notificationEmail: string };
	professional: { professionalId: string; licenseNumber: string; licenseObtainedDate: string };
	office: {
		streetLine: string;
		postalCode: string;
		city: string;
		/** `null`: a typed address before its town is looked up (the pin starts there). */
		latitude: number | null;
		longitude: number | null;
		placeId: string | null;
		/**
		 * 🔴 D-W3-33: the server's signature of Google's point (`details`), kept in this memory only and sent back as it
		 * came (`externalPlace.pointProof`); never a storage, an address or a log.
		 */
		pointProof: string | null;
		pinMoved: boolean;
		source: DoctorOnboardingAddressSource;
		phone: string;
		floor: number;
		gettingThere: string;
		parking: boolean;
		parkingKinds: DoctorOnboardingParkingKind[];
		disabilityAccess: boolean;
		accessibleToilet: boolean;
		accessibleParking: boolean;
		elevator: boolean;
		nearPublicTransport: boolean;
		paymentOptions: DoctorOnboardingPaymentOption[];
	};
	servicePricing: { price: string; customDurationInMinutes: number };
	calendar: { category: DoctorOnboardingCalendarCategory };
	liability: {
		liabilityInsurance: boolean;
		liabilityCompany: string;
		liabilityInsuranceExpiresAt: string;
	};
	terms: { accepted: boolean };
	activationIntent: {
		wantsMarketplace: boolean;
		wantsAppointments: boolean;
		wantsPayments: boolean;
	};
	salesContact: { salesContactRequested: boolean; salesContactPhone: string };
};

/** A part of the sign-up (`office`, `basicInfo` …), as the server's progress names it. */
export type DoctorOnboardingDraftSection = keyof DoctorOnboardingDraftFields;

/** Only what the person changed and the server does not have yet, part by part: an overlay, never a copy. */
export type DoctorOnboardingEdits = {
	[S in DoctorOnboardingDraftSection]?: Partial<DoctorOnboardingDraftFields[S]>;
};

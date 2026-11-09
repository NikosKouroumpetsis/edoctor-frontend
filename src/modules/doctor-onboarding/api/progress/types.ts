import type {
	ApiRequestBody,
	DoctorOnboardingProgressView,
	DoctorOnboardingSectionView,
	DoctorOnboardingStateView,
	OfficeParkingKind
} from '$shared/lib/api-client';

/**
 * FACTS of the doctor's sign-up (U-112.2), as the contract names them (`P-B3-review.md` §5.1, §5.2, D-W3-01, D-W3-04,
 * D-W3-33): the progress `GET /doctor/onboarding` and every step write answer with, and the bodies of those writes —
 * since W-4 the generated contract's own (`ApiRequestBody<operationId>`), narrowed to what a doctor sends for himself
 * (never the backoffice's `tenantUserId`, never the legacy fields). The names are the write bodies', so a screen fills
 * itself from `edits ?? progress` one to one. Type-only.
 */

type OfficeBody = Omit<ApiRequestBody<'saveDoctorOnboardingOffice'>, 'tenantUserId'>;

export type DoctorOnboardingState = DoctorOnboardingStateView;

/** What a sign-up still lacks, in the screens' order (`missing`); the first is where «Συνέχεια» opens. */
export type DoctorOnboardingSection = DoctorOnboardingSectionView;

/** The person's sex as the server takes it on the sign-up (record §6.4: «Γυναίκα» / «Άνδρας»). */
export type DoctorOnboardingGender = NonNullable<
	DoctorOnboardingProgressView['basicInfo']['gender']
>;

/** The kinds of parking under «Parking» (record §6.8, P-B3 review §5 Σ-22). */
export type DoctorOnboardingParkingKind = OfficeParkingKind;

/** U-111.2: the five ways to pay the sign-up's office takes, no online one (the server's enum keeps those for later). */
export type DoctorOnboardingPaymentOption = NonNullable<OfficeBody['paymentOptions']>[number];

/** The calendar the doctor uses most (screen 40): Google, Microsoft, eDoctor's own, none for now. */
export type DoctorOnboardingCalendarCategory =
	ApiRequestBody<'setDoctorOnboardingCalendar'>['calendarCategory'];

/** The visit's length the server takes (39): one of five, never another number. */
export type DoctorOnboardingDuration = NonNullable<
	ApiRequestBody<'saveDoctorOnboardingServicePricing'>['customDurationInMinutes']
>;

export type DoctorOnboardingOfficeFacts = {
	streetLine: string;
	postalCode: string;
	city: string;
	latitude: number;
	longitude: number;
	placeId: string | null;
	pinMoved: boolean;
	phone: string | null;
	floor: number | null;
	gettingThere: string | null;
	parking: boolean;
	parkingKinds: DoctorOnboardingParkingKind[];
	disabilityAccess: boolean;
	accessibleToilet: boolean;
	accessibleParking: boolean;
	elevator: boolean;
	nearPublicTransport: boolean;
	paymentOptions: DoctorOnboardingPaymentOption[];
};

export type DoctorOnboardingProgress = {
	state: DoctorOnboardingState;
	startedAt: string | null;
	/** While in progress: the instant an unfinished sign-up is deleted (three months from its start). */
	deleteAfter: string | null;
	completedAt: string | null;
	missing: DoctorOnboardingSection[];
	basicInfo: {
		firstName: string | null;
		lastName: string | null;
		/** `YYYY-MM-DD`. */
		dateOfBirth: string | null;
		gender: DoctorOnboardingGender | null;
	};
	contactEmail: { notificationEmail: string | null; verified: boolean };
	professional: {
		professionalId: string | null;
		licenseNumber: string | null;
		licenseObtainedDate: string | null;
	};
	office: DoctorOnboardingOfficeFacts | null;
	servicePricing: { price: number | null; customDurationInMinutes: number | null };
	calendar: { category: DoctorOnboardingCalendarCategory | null };
	liability: {
		liabilityInsurance: boolean | null;
		liabilityCompany: string | null;
		liabilityInsuranceExpiresAt: string | null;
	};
	terms: { accepted: boolean; version: string | null };
	activationIntent: {
		wantsMarketplace: boolean;
		wantsAppointments: boolean;
		wantsPayments: boolean;
	} | null;
	salesContact: { salesContactRequested: boolean | null; salesContactPhone: string | null } | null;
};

export type DoctorOnboardingBasicInfoInput = Required<
	Pick<
		ApiRequestBody<'saveDoctorOnboardingBasicInfo'>,
		'firstName' | 'lastName' | 'gender' | 'dateOfBirth'
	>
>;

export type DoctorOnboardingLicenseInput = Required<
	Pick<ApiRequestBody<'saveDoctorOnboardingLicense'>, 'licenseNumber' | 'licenseObtainedDate'>
>;

export type DoctorOnboardingEmailVerifyInput =
	ApiRequestBody<'verifyDoctorOnboardingNotificationEmail'>;

/** One step's write of the office (D-W3-04): only its own group (`address`, `details`, `amenities`, `paymentOptions`). */
export type DoctorOnboardingOfficeInput = OfficeBody;

export type DoctorOnboardingOfficeAddressInput = NonNullable<OfficeBody['address']>;

/**
 * 🔴 D-W3-33: Google's place of an address chosen from a suggestion — its id, and the server's proof of its point when
 * this page still holds it (the server alone decides whether the point stays Google's). No `source` travels (B-3).
 */
export type DoctorOnboardingExternalPlace = NonNullable<
	DoctorOnboardingOfficeAddressInput['externalPlace']
>;

export type DoctorOnboardingServicePricingInput = Required<
	Pick<ApiRequestBody<'saveDoctorOnboardingServicePricing'>, 'price' | 'customDurationInMinutes'>
>;

type LiabilityBody = ApiRequestBody<'saveDoctorOnboardingLiability'>;

/** BLOCKER 2 / B-5: only the doctors' terms, at the version the page read (recorded on «Επόμενο» of 41). */
export type DoctorOnboardingTermsAcceptance = NonNullable<LiabilityBody['legalAcceptance']>;

export type DoctorOnboardingLiabilityInput = Required<
	Pick<
		LiabilityBody,
		'liabilityInsurance' | 'liabilityCompany' | 'liabilityInsuranceExpiresAt' | 'legalAcceptance'
	>
>;

export type DoctorOnboardingActivationIntentInput =
	ApiRequestBody<'saveDoctorOnboardingActivationIntent'>;

export type DoctorOnboardingCompleteInput = Required<
	Pick<ApiRequestBody<'completeDoctorOnboarding'>, 'salesContactRequested' | 'salesContactPhone'>
>;

/**
 * One write of the sign-up, by the route it goes to (§5): each answers with the whole progress (MAJOR 3.6). The email
 * code's send is not here: it answers its own result, not the progress.
 */
export type DoctorOnboardingWrite =
	| { kind: 'start' }
	| { kind: 'basic-info'; input: DoctorOnboardingBasicInfoInput }
	| { kind: 'notification-email'; notificationEmail: string }
	| { kind: 'verify-email'; input: DoctorOnboardingEmailVerifyInput }
	| { kind: 'professional'; professionalId: string }
	| { kind: 'license'; input: DoctorOnboardingLicenseInput }
	| { kind: 'office'; input: DoctorOnboardingOfficeInput }
	| { kind: 'service-pricing'; input: DoctorOnboardingServicePricingInput }
	| { kind: 'calendar'; category: DoctorOnboardingCalendarCategory }
	| { kind: 'liability'; input: DoctorOnboardingLiabilityInput }
	| { kind: 'activation-intent'; input: DoctorOnboardingActivationIntentInput }
	| { kind: 'complete'; input: DoctorOnboardingCompleteInput };

/**
 * Why a write or a read was refused, in the kinds a screen tells apart: the session (`401`), the account locked for a
 * while (`USER_LOCKED`), the sign-up locked after three unfinished ones (W8 Delta 1: its `403`) or not started, the age
 * (`DOCTOR_UNDER_MINIMUM_AGE`), an incomplete one (`DOCTOR_ONBOARDING_INCOMPLETE`), the doctors' terms not accepted
 * (`DOCTOR_TERMS_NOT_ACCEPTED`), a point outside Greece, the email's delivery, the rate, a field, any other refusal the
 * server answered (a `4xx`: W8 Delta 2), else (no answer, a `5xx`).
 */
export type DoctorOnboardingFailure =
	| 'session'
	| 'locked'
	| 'registration-locked'
	| 'not-started'
	| 'under-age'
	| 'incomplete'
	| 'terms-not-accepted'
	| 'outside-greece'
	| 'email-send-failed'
	| 'rate-limited'
	| 'invalid'
	| 'refused'
	| 'unknown';

import type { DoctorOnboardingAddressDetails } from '$modules/doctor-onboarding/api/address-search';
import type {
	DoctorOnboardingActivationIntentInput,
	DoctorOnboardingBasicInfoInput,
	DoctorOnboardingCompleteInput,
	DoctorOnboardingLiabilityInput,
	DoctorOnboardingLicenseInput,
	DoctorOnboardingOfficeAddressInput,
	DoctorOnboardingOfficeFacts,
	DoctorOnboardingOfficeInput,
	DoctorOnboardingServicePricingInput
} from '$modules/doctor-onboarding/api/progress';
import {
	DOCTOR_ONBOARDING_DEFAULT_DURATION,
	DOCTOR_ONBOARDING_DURATIONS,
	DOCTOR_ONBOARDING_PARKING_KINDS,
	DOCTOR_ONBOARDING_PAYMENT_OPTIONS,
	DOCTOR_ONBOARDING_TERMS
} from '$modules/doctor-onboarding/config';
import type {
	DoctorOnboardingDraftFields,
	DoctorOnboardingParkingKind,
	DoctorOnboardingPaymentOption
} from '$modules/doctor-onboarding/types';
import {
	formatPostalCode,
	isValidPrice,
	readGettingThere
} from '$modules/doctor-onboarding/lib/validation';
import type {
	DoctorAccessValues,
	DoctorAddressValues,
	DoctorAmenitiesValues,
	DoctorBasicValues,
	DoctorLiabilityValues,
	DoctorOfficeDetailsValues,
	DoctorProfessionalValues,
	DoctorServicePricingValues
} from '$modules/doctor-onboarding/lib/values';

type OfficeEdits = Partial<DoctorOnboardingDraftFields['office']>;

/** A calendar day as the server takes a date (`date-time`): that day at UTC midnight. */
function toDayInstant(day: string): string {
	return new Date(`${day.slice(0, 10)}T00:00:00.000Z`).toISOString();
}

/** The body of `basic-info` (34), only once the screen is complete: the names trimmed, the day at UTC midnight. */
export function toDoctorBasicInfoInput(
	values: DoctorBasicValues
): DoctorOnboardingBasicInfoInput | null {
	if (!values.gender || !values.dateOfBirth) return null;
	return {
		firstName: values.firstName.trim(),
		lastName: values.lastName.trim(),
		gender: values.gender,
		dateOfBirth: toDayInstant(values.dateOfBirth)
	};
}

/** The body of `license` (35): both optional; a blank one goes as `null`, which is how the server clears it. */
export function toDoctorLicenseInput(
	values: DoctorProfessionalValues
): DoctorOnboardingLicenseInput {
	const licenseNumber = values.licenseNumber.trim();
	return {
		licenseNumber: licenseNumber === '' ? null : licenseNumber,
		licenseObtainedDate: values.licenseObtainedDate
			? toDayInstant(values.licenseObtainedDate)
			: null
	};
}

/**
 * 🔴 D-W3-33 · the `address` group of the office (37, §5.2, written on the pin's «Επόμενο»): one street line the server
 * splits (D-W3-04), the point under the pin, and Google's place when the address has one — its id, whether the pin
 * moved, and the server's proof as it came while this page holds it. The server alone judges whether the point stays
 * Google's. A typed address, or the device's point, has no place. `null` while there is no point yet.
 */
export function toDoctorOfficeAddressInput(
	values: DoctorAddressValues
): DoctorOnboardingOfficeAddressInput | null {
	if (values.latitude === null || values.longitude === null) return null;
	return {
		streetLine: values.streetLine.trim(),
		postalCode: values.postalCode.trim(),
		city: values.city.trim(),
		latitude: values.latitude,
		longitude: values.longitude,
		externalPlace: values.placeId
			? {
					provider: 'GOOGLE_MAPS',
					placeId: values.placeId,
					pinMoved: values.pinMoved,
					...(values.pointProof ? { pointProof: values.pointProof } : {})
				}
			: null
	};
}

/** The edits a chosen suggestion leaves (37 confirm): Google's address to correct, its point, its place, its proof. */
export function addressEditsOfDetails(details: DoctorOnboardingAddressDetails): OfficeEdits {
	return {
		streetLine: details.streetLine,
		postalCode: formatPostalCode(details.postalCode ?? ''),
		city: details.city ?? '',
		latitude: details.latitude,
		longitude: details.longitude,
		placeId: details.placeId,
		pointProof: details.pointProof,
		pinMoved: false,
		source: 'google'
	};
}

/**
 * D-W3-12 · «Χρήση τρέχουσας τοποθεσίας» on the web: the browser's point for the pin alone (no Google, no geocoder);
 * the street, the postal code and the town are typed by hand.
 */
export function addressEditsOfDevice(point: { latitude: number; longitude: number }): OfficeEdits {
	return {
		streetLine: '',
		postalCode: '',
		city: '',
		latitude: point.latitude,
		longitude: point.longitude,
		placeId: null,
		pointProof: null,
		pinMoved: false,
		source: 'device'
	};
}

/** «Μη αυτόματη εισαγωγή»: every field to type, no point yet (the pin starts in the town, B-8). */
export function addressEditsOfManual(): OfficeEdits {
	return {
		streetLine: '',
		postalCode: '',
		city: '',
		latitude: null,
		longitude: null,
		placeId: null,
		pointProof: null,
		pinMoved: false,
		source: 'manual'
	};
}

/** The office's address fields of one draft part, for the draft's `clear` after the pin's write. */
export const DOCTOR_ADDRESS_FIELDS = [
	'streetLine',
	'postalCode',
	'city',
	'latitude',
	'longitude',
	'placeId',
	'pointProof',
	'pinMoved',
	'source'
] as const satisfies readonly (keyof DoctorOnboardingDraftFields['office'])[];

/** The cards of «Τι θα βρουν οι ασθενείς», by the field each one sets. */
export type DoctorAmenityChoice =
	| 'parking'
	| 'disabilityAccess'
	| 'elevator'
	| 'nearPublicTransport';

/**
 * A detail never stands without its parent (Ε6, the server's rule `OFFICE_AMENITY_PARENT_MISSING`): no parking kind
 * without parking, no accessible toilet or parking space without step-free access, no elevator on the ground floor.
 */
function withAmenityParents(values: DoctorAmenitiesValues, floor: number): DoctorAmenitiesValues {
	return {
		...values,
		parkingKinds: values.parking ? [...values.parkingKinds] : [],
		accessibleToilet: values.disabilityAccess && values.accessibleToilet,
		accessibleParking: values.disabilityAccess && values.accessibleParking,
		elevator: floor !== 0 && values.elevator
	};
}

/**
 * The office write of «Επόμενο» on 38 (§5.2 `details`): the phone and the directions trimmed — blank goes as `null` —
 * the directions cut at 1000, the floor as shown. Moving down to the ground floor an office the server keeps with an
 * elevator also sends `amenities` with the elevator off, in the same write (the card's rule, the application's).
 */
export function toDoctorOfficeDetailsInput(
	values: DoctorOfficeDetailsValues,
	saved: DoctorOnboardingOfficeFacts | null
): DoctorOnboardingOfficeInput {
	const phone = values.phone.trim();
	const gettingThere = readGettingThere(values.gettingThere.trim());
	const details = {
		phone: phone === '' ? null : phone,
		floor: values.floor,
		gettingThere: gettingThere === '' ? null : gettingThere
	};
	if (values.floor !== 0 || !saved?.elevator) return { details };
	return {
		details,
		amenities: {
			parking: saved.parking,
			parkingKinds: [...saved.parkingKinds],
			disabilityAccess: saved.disabilityAccess,
			accessibleToilet: saved.accessibleToilet,
			accessibleParking: saved.accessibleParking,
			elevator: false,
			nearPublicTransport: saved.nearPublicTransport
		}
	};
}

/** The `amenities` group of 38: every detail with its parent (Ε6), the elevator only off the ground floor. */
export function toDoctorAmenitiesInput(
	values: DoctorAmenitiesValues,
	floor: number
): NonNullable<DoctorOnboardingOfficeInput['amenities']> {
	return withAmenityParents(values, floor);
}

/** The amenities after the cards chosen (`chosen`): a parent let go takes its details with it (`doctor.js:291`). */
export function toDoctorAmenitiesEdits(
	values: DoctorAmenitiesValues,
	chosen: readonly string[],
	floor: number
): DoctorAmenitiesValues {
	const has = (choice: DoctorAmenityChoice) => chosen.includes(choice);
	return withAmenityParents(
		{
			...values,
			parking: has('parking'),
			disabilityAccess: has('disabilityAccess'),
			elevator: has('elevator'),
			nearPublicTransport: has('nearPublicTransport')
		},
		floor
	);
}

/** The parking kinds after one is ticked or let go, always in the server's order. */
export function toggleDoctorParkingKind(
	kinds: readonly DoctorOnboardingParkingKind[],
	kind: DoctorOnboardingParkingKind
): DoctorOnboardingParkingKind[] {
	const next = kinds.includes(kind) ? kinds.filter((each) => each !== kind) : [...kinds, kind];
	return DOCTOR_ONBOARDING_PARKING_KINDS.filter((each) => next.includes(each));
}

/** 🔴 U-111.2: the `paymentOptions` group of 38 — only the five offered, in their order, never an online one. */
export function toDoctorPaymentOptionsInput(
	options: readonly string[]
): DoctorOnboardingPaymentOption[] {
	return DOCTOR_ONBOARDING_PAYMENT_OPTIONS.filter((option) => options.includes(option));
}

/**
 * The body of `service-pricing` (39), only for a price of 1–9999 in digits: whole euros and the visit's length — one of
 * the five the server takes (W-4: the contract's type), 30 for any other.
 */
export function toDoctorServicePricingInput(
	values: DoctorServicePricingValues
): DoctorOnboardingServicePricingInput | null {
	if (!isValidPrice(values.price)) return null;
	const length =
		DOCTOR_ONBOARDING_DURATIONS.find((minutes) => minutes === values.customDurationInMinutes) ??
		DOCTOR_ONBOARDING_DEFAULT_DURATION;
	return { price: Number(values.price), customDurationInMinutes: length };
}

/**
 * 🔴 Ε2 (D-W3-01, BLOCKER 2): the body of `liability` (41) — the insurance answer, its details only with «Ναι» (blank
 * ⇒ `null`, the day at UTC midnight), and the acceptance of the doctors' terms ONLY, at the `version` in force. `null`
 * until both are answered and a version is known.
 */
export function toDoctorLiabilityInput(
	values: DoctorLiabilityValues,
	version: string | null
): DoctorOnboardingLiabilityInput | null {
	if (values.liabilityInsurance === null || !values.termsAccepted || !version) return null;
	const insured = values.liabilityInsurance;
	const company = values.liabilityCompany.trim();
	return {
		liabilityInsurance: insured,
		liabilityCompany: insured && company ? company : null,
		liabilityInsuranceExpiresAt:
			insured && values.liabilityInsuranceExpiresAt
				? toDayInstant(values.liabilityInsuranceExpiresAt)
				: null,
		legalAcceptance: {
			context: 'DOCTOR',
			acceptances: [{ documentCode: DOCTOR_ONBOARDING_TERMS.documentCode, version, accepted: true }]
		}
	};
}

/** The body of `activation-intent` (42): what the doctor wants turned on. */
export function toDoctorActivationIntentInput(
	values: DoctorAccessValues
): DoctorOnboardingActivationIntentInput {
	return {
		wantsMarketplace: values.wantsMarketplace,
		wantsAppointments: values.wantsAppointments,
		wantsPayments: values.wantsPayments
	};
}

/** The body of `complete` (42): the call asked for or not, and its mobile only while it is asked for. No terms here. */
export function toDoctorCompleteInput(values: DoctorAccessValues): DoctorOnboardingCompleteInput {
	const phone = values.salesContactPhone.trim();
	return {
		salesContactRequested: values.salesContactRequested,
		salesContactPhone: values.salesContactRequested && phone ? phone : null
	};
}

/** The office's fields of each of its screens, for the draft's `clear` after that screen's write. */
export const DOCTOR_OFFICE_DETAILS_FIELDS = [
	'phone',
	'floor',
	'gettingThere'
] as const satisfies readonly (keyof DoctorOnboardingDraftFields['office'])[];

export const DOCTOR_AMENITY_FIELDS = [
	'parking',
	'parkingKinds',
	'disabilityAccess',
	'accessibleToilet',
	'accessibleParking',
	'elevator',
	'nearPublicTransport'
] as const satisfies readonly (keyof DoctorOnboardingDraftFields['office'])[];

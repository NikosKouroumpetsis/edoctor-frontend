import type { DoctorOnboardingProgress } from '$modules/doctor-onboarding/api/progress';
import {
	DOCTOR_ONBOARDING_DEFAULT_DURATION,
	DOCTOR_ONBOARDING_DURATIONS,
	DOCTOR_ONBOARDING_PAYMENT_OPTIONS
} from '$modules/doctor-onboarding/config';
import type {
	DoctorOnboardingAddressSource,
	DoctorOnboardingCalendarCategory,
	DoctorOnboardingDraftFields,
	DoctorOnboardingDraftSection,
	DoctorOnboardingEdits,
	DoctorOnboardingGender,
	DoctorOnboardingParkingKind,
	DoctorOnboardingPaymentOption
} from '$modules/doctor-onboarding/types';
import { officeFloorOf } from '$modules/doctor-onboarding/lib/office';
import { formatPostalCode } from '$modules/doctor-onboarding/lib/validation';

/**
 * 🔴 U-112.2 (P-W3 §3.3.7, P-A3 Σ6): what each screen shows — the doctor's unsaved edit (even an empty one), else what
 * the server keeps, else the step's default. The same rule as the draft's own `read`, on its plain edits.
 */
function readEdit<
	S extends DoctorOnboardingDraftSection,
	F extends keyof DoctorOnboardingDraftFields[S]
>(
	edits: DoctorOnboardingEdits,
	section: S,
	field: F,
	fallback: DoctorOnboardingDraftFields[S][F]
): DoctorOnboardingDraftFields[S][F] {
	const part = edits[section] as Partial<DoctorOnboardingDraftFields[S]> | undefined;
	return part !== undefined && Object.hasOwn(part, field)
		? (part[field] as DoctorOnboardingDraftFields[S][F])
		: fallback;
}

type Progress = DoctorOnboardingProgress | undefined;

export type DoctorBasicValues = {
	firstName: string;
	lastName: string;
	/** `YYYY-MM-DD`, or empty. */
	dateOfBirth: string;
	gender: DoctorOnboardingGender | null;
};

/** 34 «Τα στοιχεία σας»: the names are the account's own (the server's progress reads them from it, prefilled). */
export function readDoctorBasicValues(edits: DoctorOnboardingEdits, progress: Progress) {
	const saved = progress?.basicInfo;
	const gender = edits.basicInfo?.gender ?? saved?.gender ?? null;
	return {
		firstName: readEdit(edits, 'basicInfo', 'firstName', saved?.firstName ?? ''),
		lastName: readEdit(edits, 'basicInfo', 'lastName', saved?.lastName ?? ''),
		dateOfBirth: readEdit(edits, 'basicInfo', 'dateOfBirth', saved?.dateOfBirth ?? ''),
		gender
	} satisfies DoctorBasicValues;
}

/** 34 «Ποιο email να χρησιμοποιούμε;»: the unsaved edit, else the one on file. */
export function readDoctorContactEmail(edits: DoctorOnboardingEdits, progress: Progress): string {
	return readEdit(
		edits,
		'contactEmail',
		'notificationEmail',
		progress?.contactEmail.notificationEmail ?? ''
	);
}

export type DoctorProfessionalValues = {
	professionalId: string | null;
	licenseNumber: string;
	/** `YYYY-MM-DD`, or empty. */
	licenseObtainedDate: string;
};

/** 35 «Η ειδικότητά σας»: the specialty and the license, the unsaved edits over the server's. */
export function readDoctorProfessionalValues(
	edits: DoctorOnboardingEdits,
	progress: Progress
): DoctorProfessionalValues {
	const saved = progress?.professional;
	const id = readEdit(edits, 'professional', 'professionalId', saved?.professionalId ?? '');
	return {
		professionalId: id || null,
		licenseNumber: readEdit(edits, 'professional', 'licenseNumber', saved?.licenseNumber ?? ''),
		licenseObtainedDate: readEdit(
			edits,
			'professional',
			'licenseObtainedDate',
			(saved?.licenseObtainedDate ?? '').slice(0, 10)
		)
	};
}

export type DoctorAddressValues = {
	streetLine: string;
	postalCode: string;
	city: string;
	latitude: number | null;
	longitude: number | null;
	placeId: string | null;
	/** D-W3-33: only in this page's memory (a chosen suggestion's), never the server's progress. */
	pointProof: string | null;
	pinMoved: boolean;
	/** Where an unsaved address came from; `null` for the saved one. */
	source: DoctorOnboardingAddressSource | null;
};

/**
 * 37: the office's address across its three screens — an unsaved choice or correction wins field by field, else the
 * saved office's.
 */
export function readDoctorAddressValues(
	edits: DoctorOnboardingEdits,
	progress: Progress
): DoctorAddressValues {
	const saved = progress?.office ?? null;
	return {
		streetLine: readEdit(edits, 'office', 'streetLine', saved?.streetLine ?? ''),
		postalCode: readEdit(edits, 'office', 'postalCode', formatPostalCode(saved?.postalCode ?? '')),
		city: readEdit(edits, 'office', 'city', saved?.city ?? ''),
		latitude: readEdit(edits, 'office', 'latitude', saved?.latitude ?? null),
		longitude: readEdit(edits, 'office', 'longitude', saved?.longitude ?? null),
		placeId: readEdit(edits, 'office', 'placeId', saved?.placeId ?? null),
		pointProof: readEdit(edits, 'office', 'pointProof', null),
		pinMoved: readEdit(edits, 'office', 'pinMoved', saved?.pinMoved ?? false),
		source: edits.office?.source ?? null
	};
}

/** The address as one line, as the pin's pill and the location's pill show it: «Καραΐσκου 74, 185 32 Πειραιάς». */
export function formatDoctorAddress(
	values: Pick<DoctorAddressValues, 'streetLine' | 'postalCode' | 'city'>
) {
	const town = [values.postalCode.trim(), values.city.trim()].filter(Boolean).join(' ');
	return [values.streetLine.trim(), town].filter(Boolean).join(', ');
}

export type DoctorOfficeDetailsValues = { phone: string; floor: number; gettingThere: string };

/** 38 «Πώς θα σας βρουν»: the phone, the floor (the ground floor while none is kept, D-W3-26) and the directions. */
export function readDoctorOfficeDetailsValues(
	edits: DoctorOnboardingEdits,
	progress: Progress,
	showPhone: (stored: string) => string = (stored) => stored
): DoctorOfficeDetailsValues {
	const saved = progress?.office ?? null;
	return {
		// W8 Delta 3 (N1): the kept number as a field shows it (as the postal code's `formatPostalCode`); a typed one as typed.
		phone: readEdit(edits, 'office', 'phone', showPhone(saved?.phone ?? '')),
		floor: readEdit(edits, 'office', 'floor', officeFloorOf(saved?.floor)),
		gettingThere: readEdit(edits, 'office', 'gettingThere', saved?.gettingThere ?? '')
	};
}

export type DoctorAmenitiesValues = {
	parking: boolean;
	parkingKinds: DoctorOnboardingParkingKind[];
	disabilityAccess: boolean;
	accessibleToilet: boolean;
	accessibleParking: boolean;
	elevator: boolean;
	nearPublicTransport: boolean;
};

/**
 * 38 «Τι θα βρουν οι ασθενείς»: the unsaved choices over the saved ones. The elevator exists only off the ground floor
 * (`floor`), so there it reads «no» whatever was chosen before (record §6.8).
 */
export function readDoctorAmenitiesValues(
	edits: DoctorOnboardingEdits,
	progress: Progress,
	floor: number
): DoctorAmenitiesValues {
	const saved = progress?.office ?? null;
	return {
		parking: readEdit(edits, 'office', 'parking', saved?.parking ?? false),
		parkingKinds: readEdit(edits, 'office', 'parkingKinds', saved?.parkingKinds ?? []),
		disabilityAccess: readEdit(
			edits,
			'office',
			'disabilityAccess',
			saved?.disabilityAccess ?? false
		),
		accessibleToilet: readEdit(
			edits,
			'office',
			'accessibleToilet',
			saved?.accessibleToilet ?? false
		),
		accessibleParking: readEdit(
			edits,
			'office',
			'accessibleParking',
			saved?.accessibleParking ?? false
		),
		elevator: floor !== 0 && readEdit(edits, 'office', 'elevator', saved?.elevator ?? false),
		nearPublicTransport: readEdit(
			edits,
			'office',
			'nearPublicTransport',
			saved?.nearPublicTransport ?? false
		)
	};
}

/** 38 «Πώς μπορούν να πληρώσουν»: the unsaved choice, else the saved one — only ever the five offered (U-111.2). */
export function readDoctorPaymentOptions(
	edits: DoctorOnboardingEdits,
	progress: Progress
): DoctorOnboardingPaymentOption[] {
	const chosen = readEdit(
		edits,
		'office',
		'paymentOptions',
		progress?.office?.paymentOptions ?? []
	);
	return DOCTOR_ONBOARDING_PAYMENT_OPTIONS.filter((option) => chosen.includes(option));
}

export type DoctorServicePricingValues = { price: string; customDurationInMinutes: number };

/** 39: the price as typed (digits) and the visit's length — one the server takes, 30 until another is chosen. */
export function readDoctorServicePricingValues(
	edits: DoctorOnboardingEdits,
	progress: Progress
): DoctorServicePricingValues {
	const saved = progress?.servicePricing;
	const duration = readEdit(
		edits,
		'servicePricing',
		'customDurationInMinutes',
		saved?.customDurationInMinutes ?? DOCTOR_ONBOARDING_DEFAULT_DURATION
	);
	return {
		price: readEdit(edits, 'servicePricing', 'price', saved?.price ? String(saved.price) : ''),
		customDurationInMinutes: (DOCTOR_ONBOARDING_DURATIONS as readonly number[]).includes(duration)
			? duration
			: DOCTOR_ONBOARDING_DEFAULT_DURATION
	};
}

/** 40: the calendar chosen here, else the one the server keeps; `null` until one is answered. */
export function readDoctorCalendarCategory(
	edits: DoctorOnboardingEdits,
	progress: Progress
): DoctorOnboardingCalendarCategory | null {
	return edits.calendar?.category ?? progress?.calendar.category ?? null;
}

export type DoctorLiabilityValues = {
	liabilityInsurance: boolean | null;
	liabilityCompany: string;
	/** `YYYY-MM-DD`, or empty. */
	liabilityInsuranceExpiresAt: string;
	termsAccepted: boolean;
};

/** 41: the insurance answer with its optional details, and the doctors' terms as accepted here or on the server. */
export function readDoctorLiabilityValues(
	edits: DoctorOnboardingEdits,
	progress: Progress
): DoctorLiabilityValues {
	const saved = progress?.liability;
	return {
		liabilityInsurance: edits.liability?.liabilityInsurance ?? saved?.liabilityInsurance ?? null,
		liabilityCompany: readEdit(
			edits,
			'liability',
			'liabilityCompany',
			saved?.liabilityCompany ?? ''
		),
		liabilityInsuranceExpiresAt: readEdit(
			edits,
			'liability',
			'liabilityInsuranceExpiresAt',
			(saved?.liabilityInsuranceExpiresAt ?? '').slice(0, 10)
		),
		termsAccepted: readEdit(edits, 'terms', 'accepted', progress?.terms.accepted ?? false)
	};
}

export type DoctorAccessValues = {
	wantsMarketplace: boolean;
	wantsAppointments: boolean;
	wantsPayments: boolean;
	salesContactRequested: boolean;
	salesContactPhone: string;
};

/**
 * 42 · what to turn on and whether a team member calls (record §6.4): the unsaved answers over the saved ones, else
 * the prototype's start — the profile and online booking on, the till off, the call asked for with no number yet.
 */
export function readDoctorAccessValues(
	edits: DoctorOnboardingEdits,
	progress: Progress,
	showPhone: (stored: string) => string = (stored) => stored
): DoctorAccessValues {
	const intent = progress?.activationIntent ?? null;
	const contact = progress?.salesContact ?? null;
	return {
		wantsMarketplace: readEdit(
			edits,
			'activationIntent',
			'wantsMarketplace',
			intent?.wantsMarketplace ?? true
		),
		wantsAppointments: readEdit(
			edits,
			'activationIntent',
			'wantsAppointments',
			intent?.wantsAppointments ?? true
		),
		wantsPayments: readEdit(
			edits,
			'activationIntent',
			'wantsPayments',
			intent?.wantsPayments ?? false
		),
		salesContactRequested: readEdit(
			edits,
			'salesContact',
			'salesContactRequested',
			contact?.salesContactRequested ?? true
		),
		salesContactPhone: readEdit(
			edits,
			'salesContact',
			'salesContactPhone',
			showPhone(contact?.salesContactPhone ?? '')
		)
	};
}

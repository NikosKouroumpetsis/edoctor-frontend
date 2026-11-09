import type { DoctorOnboardingProgressView } from '$shared/lib/api-client';
import type {
	DoctorOnboardingCalendarCategory,
	DoctorOnboardingGender,
	DoctorOnboardingOfficeFacts,
	DoctorOnboardingParkingKind,
	DoctorOnboardingPaymentOption,
	DoctorOnboardingProgress,
	DoctorOnboardingSection,
	DoctorOnboardingState
} from './types';

type Record_ = Record<string, unknown>;

/** The members of a contract's enum, from a record that must name every one (a new member does not compile, W-4). */
const membersOf = <T extends string>(members: Record<T, true>): readonly T[] =>
	Object.keys(members) as T[];

const STATES = membersOf<DoctorOnboardingState>({
	NOT_STARTED: true,
	IN_PROGRESS: true,
	COMPLETED: true,
	LOCKED: true
});
const SECTIONS = membersOf<DoctorOnboardingSection>({
	BASIC_INFO: true,
	CONTACT_EMAIL: true,
	PROFESSIONAL: true,
	OFFICE_ADDRESS: true,
	OFFICE_PHONE: true,
	OFFICE_PAYMENTS: true,
	SERVICE_PRICING: true,
	CALENDAR: true,
	LIABILITY: true,
	TERMS: true,
	ACTIVATION_INTENT: true
});
const GENDERS = membersOf<DoctorOnboardingGender>({ FEMALE: true, MALE: true });
const PARKING_KINDS = membersOf<DoctorOnboardingParkingKind>({
	PRIVATE: true,
	PUBLIC_NEARBY: true,
	STREET: true
});
// U-111.2: the two online ways stay the server's for later; the page never shows them, so they are not read either.
const PAYMENT_OPTIONS = membersOf<DoctorOnboardingPaymentOption>({
	CASH: true,
	CARD: true,
	IRIS: true,
	STUDENT_CARD: true,
	UNEMPLOYMENT_CARD: true
});
const CALENDARS = membersOf<DoctorOnboardingCalendarCategory>({
	GOOGLE: true,
	MICROSOFT: true,
	DIRECT: true,
	NONE: true
});

const isRecord = (value: unknown): value is Record_ =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
/** A part of the answer under the contract's names, or none of it when it came as anything but an object. */
const part = <T extends object>(value: T | null | undefined): Partial<T> =>
	isRecord(value) ? value : {};
const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const flag = (value: unknown): boolean => value === true;
const flagOrNull = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);
const finite = (value: unknown): number | null =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;
const oneOf = <T extends string>(list: readonly T[], value: unknown): T | null =>
	list.find((item) => item === value) ?? null;
/** The known members of a list, once each, in the server's order; anything else is left out. */
const listOf = <T extends string>(list: readonly T[], value: unknown): T[] =>
	Array.isArray(value)
		? [...new Set(value.filter((item): item is T => list.includes(item as T)))]
		: [];

/** The office as the progress carries it, or `null` without one, or without a point the map can draw. */
function mapOffice(
	value: DoctorOnboardingProgressView['office'] | undefined
): DoctorOnboardingOfficeFacts | null {
	if (!isRecord(value)) return null;
	const latitude = finite(value.latitude);
	const longitude = finite(value.longitude);
	if (latitude === null || longitude === null) return null;
	return {
		streetLine: text(value.streetLine) ?? '',
		postalCode: text(value.postalCode) ?? '',
		city: text(value.city) ?? '',
		latitude,
		longitude,
		placeId: text(value.placeId),
		pinMoved: flag(value.pinMoved),
		phone: text(value.phone),
		floor: Number.isInteger(value.floor) ? (value.floor as number) : null,
		gettingThere: text(value.gettingThere),
		parking: flag(value.parking),
		parkingKinds: listOf(PARKING_KINDS, value.parkingKinds),
		disabilityAccess: flag(value.disabilityAccess),
		accessibleToilet: flag(value.accessibleToilet),
		accessibleParking: flag(value.accessibleParking),
		elevator: flag(value.elevator),
		nearPublicTransport: flag(value.nearPublicTransport),
		paymentOptions: listOf(PAYMENT_OPTIONS, value.paymentOptions)
	};
}

/**
 * `DoctorOnboardingProgressView` as FACTS, or `null` for an answer that is not one (no known `state`): a page never
 * guesses a sign-up from a broken answer. The contract types the answer; nothing checks it on the way in, so every part
 * is read as it really came: unknown values read as absent, every text stays text (U-65.6).
 */
export function mapDoctorOnboardingProgress(
	view: DoctorOnboardingProgressView | null | undefined
): DoctorOnboardingProgress | null {
	if (!isRecord(view)) return null;
	const state = oneOf(STATES, view.state);
	if (!state) return null;
	const basicInfo = part(view.basicInfo);
	const contactEmail = part(view.contactEmail);
	const professional = part(view.professional);
	const servicePricing = part(view.servicePricing);
	const liability = part(view.liability);
	const terms = part(view.terms);
	const intent = isRecord(view.activationIntent) ? view.activationIntent : null;
	const sales = isRecord(view.salesContact) ? view.salesContact : null;
	const day = text(basicInfo.dateOfBirth);
	return {
		state,
		startedAt: text(view.startedAt),
		deleteAfter: text(view.deleteAfter),
		completedAt: text(view.completedAt),
		missing: listOf(SECTIONS, view.missing),
		basicInfo: {
			firstName: text(basicInfo.firstName),
			lastName: text(basicInfo.lastName),
			dateOfBirth: day && /^\d{4}-\d{2}-\d{2}/u.test(day) ? day.slice(0, 10) : null,
			gender: oneOf(GENDERS, basicInfo.gender)
		},
		contactEmail: {
			notificationEmail: text(contactEmail.notificationEmail),
			verified: flag(contactEmail.verified)
		},
		professional: {
			professionalId: text(professional.professionalId),
			licenseNumber: text(professional.licenseNumber),
			licenseObtainedDate: text(professional.licenseObtainedDate)
		},
		office: mapOffice(view.office),
		servicePricing: {
			price: finite(servicePricing.price),
			customDurationInMinutes: finite(servicePricing.customDurationInMinutes)
		},
		calendar: { category: oneOf(CALENDARS, part(view.calendar).category) },
		liability: {
			liabilityInsurance: flagOrNull(liability.liabilityInsurance),
			liabilityCompany: text(liability.liabilityCompany),
			liabilityInsuranceExpiresAt: text(liability.liabilityInsuranceExpiresAt)
		},
		terms: { accepted: flag(terms.accepted), version: text(terms.version) },
		activationIntent: intent
			? {
					wantsMarketplace: flag(intent.wantsMarketplace),
					wantsAppointments: flag(intent.wantsAppointments),
					wantsPayments: flag(intent.wantsPayments)
				}
			: null,
		salesContact: sales
			? {
					salesContactRequested: flagOrNull(sales.salesContactRequested),
					salesContactPhone: text(sales.salesContactPhone)
				}
			: null
	};
}

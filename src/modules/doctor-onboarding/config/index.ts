import type { DoctorOnboardingDuration } from '$modules/doctor-onboarding/api/progress';
import type {
	DoctorOnboardingCalendarCategory,
	DoctorOnboardingParkingKind,
	DoctorOnboardingPaymentOption
} from '$modules/doctor-onboarding/types';

/**
 * The doctor's sign-up's static limits and places (wave 3 · screens 33–42), each the copy of a rule the server owns,
 * so a field never accepts what the write would refuse (the application's `doctor-onboarding/lib/validation`). The
 * server is still the judge of every one (U-65.6).
 */

/** The names (`basic-info`: 1…100), the license number (≤ 50) and the email (≤ 254), the server's schema. */
export const DOCTOR_ONBOARDING_NAME_MAX_LENGTH = 100;
export const DOCTOR_ONBOARDING_LICENSE_NUMBER_MAX_LENGTH = 50;
export const DOCTOR_ONBOARDING_EMAIL_MAX_LENGTH = 254;

/** «Οδός και αριθμός» in one line (D-W3-04, the server splits it) and the town: 1…200. */
export const DOCTOR_ONBOARDING_STREET_LINE_MAX_LENGTH = 200;
export const DOCTOR_ONBOARDING_CITY_MAX_LENGTH = 200;

/** A Greek postal code as typed: five digits and a space after the third, six characters at most. */
export const DOCTOR_ONBOARDING_POSTAL_CODE_MAX_LENGTH = 6;

/** Record §6.4: a doctor is at least 18 years old (the server's `DOCTOR_UNDER_MINIMUM_AGE`). */
export const DOCTOR_ONBOARDING_MIN_AGE_YEARS = 18;

/** The email's code: 6 digits; a new one after 60 seconds (the sign-in's cooldown, the booking's own). */
export const DOCTOR_ONBOARDING_EMAIL_CODE_LENGTH = 6;
export const DOCTOR_ONBOARDING_EMAIL_RESEND_SECONDS = 60;

/** The specialty list's search (record §6.2.4, the prototype's 60). */
export const DOCTOR_ONBOARDING_SPECIALTY_SEARCH_MAX_LENGTH = 60;

/**
 * The address search (record §6.7.2, Google's advice, the server's limits, B-7): at most 120 characters, from two
 * letters on, asked 300 ms after the last key; at most five suggestions come back.
 */
export const DOCTOR_ONBOARDING_ADDRESS_QUERY_MAX_LENGTH = 120;
export const DOCTOR_ONBOARDING_ADDRESS_QUERY_MIN_LENGTH = 2;
export const DOCTOR_ONBOARDING_ADDRESS_DEBOUNCE_MS = 300;
export const DOCTOR_ONBOARDING_ADDRESS_SUGGESTIONS_MAX = 5;

/** A town's name as the public location suggestions take it (`q`: 1…100), to start a typed address's pin there. */
export const DOCTOR_ONBOARDING_TOWN_QUERY_MAX_LENGTH = 100;

/**
 * The location's maps (record §6.7, the prototype's `ATHENS` and zooms): Athens at a city's zoom with no address, the
 * address at street level, the pin at a doorway's.
 */
export const DOCTOR_ONBOARDING_MAP = {
	athens: { latitude: 37.9755, longitude: 23.7348 },
	cityZoom: 10.5,
	addressZoom: 15,
	pinZoom: 17
} as const;

/**
 * 38 · the office (record §6.8, §5.2): a phone as people type it (the prototype's and the application's 16; the server
 * takes up to 32), the directions up to 1000 (U-68.2), the floor from the basement (−1) to the 20th, the ground floor
 * first (D-W3-26).
 */
export const DOCTOR_ONBOARDING_PHONE_MAX_LENGTH = 16;
export const DOCTOR_ONBOARDING_GETTING_THERE_MAX_LENGTH = 1000;
export const DOCTOR_ONBOARDING_FLOOR = { min: -1, max: 20, start: 0 } as const;

/** 38 · the kinds of parking under «Parking», in the server's order (P-B3 review §5 Σ-22). */
export const DOCTOR_ONBOARDING_PARKING_KINDS: readonly DoctorOnboardingParkingKind[] = [
	'PRIVATE',
	'PUBLIC_NEARBY',
	'STREET'
];

/** 🔴 U-111.2: the office's own five ways to pay, never an online one (the server's enum keeps those for later). */
export const DOCTOR_ONBOARDING_PAYMENT_OPTIONS: readonly DoctorOnboardingPaymentOption[] = [
	'CASH',
	'CARD',
	'IRIS',
	'STUDENT_CARD',
	'UNEMPLOYMENT_CARD'
];

/** 39 · the price in whole euros, 1 to 9999 (four digits), and the visit's lengths the server takes, 30 first. */
export const DOCTOR_ONBOARDING_PRICE_MAX = 9999;
export const DOCTOR_ONBOARDING_PRICE_DIGITS = 4;
export const DOCTOR_ONBOARDING_DURATIONS = [
	15, 20, 30, 45, 60
] as const satisfies readonly DoctorOnboardingDuration[];
export const DOCTOR_ONBOARDING_DEFAULT_DURATION = 30 satisfies DoctorOnboardingDuration;

/** 40 · the calendars in the prototype's order; no Apple, which is not supported. */
export const DOCTOR_ONBOARDING_CALENDAR_OPTIONS: readonly DoctorOnboardingCalendarCategory[] = [
	'GOOGLE',
	'MICROSOFT',
	'DIRECT',
	'NONE'
];

/** 41 · the optional insurance company, as the server's short text (1…120). */
export const DOCTOR_ONBOARDING_LIABILITY_COMPANY_MAX_LENGTH = 120;

/**
 * 🔴 Ε2 (D-W3-01, U-59.1): the ONE document the sign-up asks to accept, by its code and its page (the backend's legal
 * documents publish it at this slug).
 */
export const DOCTOR_ONBOARDING_TERMS = {
	documentCode: 'DOCTOR_MARKETPLACE_TERMS',
	slug: 'doctor-marketplace-terms'
} as const;

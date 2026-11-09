/**
 * The booking's static limits (wave 3 · screen 30), each the copy of a rule the server owns, so the page never accepts
 * what the server refuses (the application's `config/booking`).
 */

/** `patientNote` (D-39, m11): at most 500, counted in code points as the server's schema counts them. */
export const BOOKING_PATIENT_NOTE_MAX_LENGTH = 500;

/** U-103.2: the patient books ONE visit, of quantity one; the contract's list stays the server's. */
export const BOOKING_SERVICE_QUANTITY = 1;

/** The names of a relative and of the person: the server's `maxLength` (`patient/me/profile`, `relatives`). */
export const BOOKING_NAME_MAX_LENGTH = 100;

/**
 * U-65.6: the mobiles (the relative's, and the person's own on «Το κινητό σας», review w3-w3 R1 MINOR-3) and the relative's
 * email, the way the form caps them (the server checks them again).
 */
export const BOOKING_RELATIVE_PHONE_MAX_LENGTH = 16;
export const BOOKING_RELATIVE_EMAIL_MAX_LENGTH = 120;

/** The phone challenge's code: 6 digits, and a new one after 60 seconds (the sign-in's cooldown). */
export const BOOKING_PHONE_CODE_LENGTH = 6;
export const BOOKING_PHONE_RESEND_SECONDS = 60;

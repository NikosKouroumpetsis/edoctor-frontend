import { getTenantSlug } from '$shared/config';
import type {
	DoctorProfileBaseView,
	LoginResult,
	LogoutResult,
	PatientSelfResponseView
} from '$shared/lib/api-client';
import { ApiError, httpSessionGet, httpSessionPost } from '$shared/lib/http';
import type { AuthIdentitySubmission } from '$modules/auth/types';

const PATIENT_SELF_PATH = '/patient/me';
const DOCTOR_BASE_PATH = '/doctor/profile/base';
// The refusals that say «this account is no doctor» (`REFUSAL_STATUSES` of the application).
const DOCTOR_REFUSALS = [401, 403];

export const authQueryKeys = {
	patientSelf: () => ['auth', 'patient-self'] as const,
	doctorAccount: () => ['auth', 'doctor-account'] as const,
	legalVersion: (slug: string, lang: string) => ['auth', 'legal-version', slug, lang] as const,
	/** Wave 4.5 · screen 59: the account's own sign-in methods, and its live sessions (both personal). */
	signInMethods: () => ['auth', 'sign-in-methods'] as const,
	accountSessions: () => ['auth', 'account-sessions'] as const
};

/** The session as the browser learns it: a guest, or a member with or without a patient profile. */
export type PatientSelfFacts =
	| { signedIn: false }
	| {
			signedIn: true;
			hasPatientProfile: boolean;
			firstName: string | null;
			lastName: string | null;
			/** Who it is, to tell another account in this tab; `null` without a patient profile (the server names none). */
			accountKey: string | null;
			/**
			 * 🔴 U-168 / D-W45-10: the sign-in address as the SERVER hides it (`loginEmailMasked`, `e***a@example.gr`). The
			 * whole address never comes, and nothing here hides one: a value that is no mask is no value.
			 */
			maskedLoginEmail: string | null;
			/** The sign-in mobile as the server hides it (`loginPhoneMasked`, D-47), read the same way. */
			maskedLoginPhone: string | null;
			/**
			 * Wave 4.5 · screen 58: the ΑΜΚΑ and the ΑΦΜ as the server hides them (`amkaMasked` `•••••••2345`, `afmMasked`
			 * `•••••6789`: the last four digits) — what «Προσωπικά στοιχεία» prints; `null` when none is stored.
			 */
			maskedAmka: string | null;
			maskedAfm: string | null;
	  };

// Long enough for any real name or mask, short enough that a broken answer cannot grow what a page draws.
const MAX_FIELD_LENGTH = 120;

/** A text of the answer, or `null`: blank, oversized and what is no text at all read as absence (never a throw). */
const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() && value.trim().length <= MAX_FIELD_LENGTH
		? value.trim()
		: null;

/** A mask only when it looks like one (the booking's rule for the mobile, U-65.6): never a whole value kept as a mask. */
const mask = (value: unknown, marks: RegExp): string | null => {
	const masked = text(value);
	return masked && marks.test(masked) ? masked : null;
};

// 🔴 U-168: an ΑΜΚΑ / ΑΦΜ is kept only as hidden marks and at most its last four digits — a whole number is no value.
const ID_MASK = /^[•*]+\d{0,4}$/u;

function mapPatientSelf(view: PatientSelfResponseView): PatientSelfFacts {
	return {
		signedIn: true,
		hasPatientProfile: Boolean(view),
		firstName: text(view?.firstName),
		lastName: text(view?.lastName),
		accountKey: view?.tenantUserId ?? null,
		maskedLoginEmail: mask(view?.loginEmailMasked, /\*{3}/u),
		maskedLoginPhone: mask(view?.loginPhoneMasked, /[•*]/u),
		maskedAmka: mask(view?.amkaMasked, ID_MASK),
		maskedAfm: mask(view?.afmMasked, ID_MASK)
	};
}

/**
 * The confirming read (`GET /patient/me`): the middleware renews the cookies on it, and `null` is a real answer (a
 * session without a patient profile). A `401` is no failure: it is what a guest is.
 */
export async function getPatientSelf(signal?: AbortSignal): Promise<PatientSelfFacts> {
	try {
		return mapPatientSelf(
			await httpSessionGet<PatientSelfResponseView>(PATIENT_SELF_PATH, { signal })
		);
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) return { signedIn: false };
		throw error;
	}
}

/**
 * An account the server names no patient for, as the doctor's read tells it: `ruledOut` the server SAID it is no doctor,
 * the only answer that owes it the onboarding (D-83); `accountKey` who the doctor is, to tell another account in this
 * tab (R-13). Only the id stays of the answer.
 */
export type DoctorAccountFacts = { ruledOut: boolean; accountKey: string | null };

export async function getDoctorAccount(signal?: AbortSignal): Promise<DoctorAccountFacts> {
	try {
		const base = await httpSessionGet<Pick<DoctorProfileBaseView, 'doctorId'> | null>(
			DOCTOR_BASE_PATH,
			{ signal }
		);
		return { ruledOut: false, accountKey: base?.doctorId ?? null };
	} catch (error) {
		if (error instanceof ApiError && DOCTOR_REFUSALS.includes(error.status)) {
			return { ruledOut: true, accountKey: null };
		}
		throw error;
	}
}

/** An address and a password; the cookies are set on the answer, never returned. */
export function loginWithPassword(email: string, password: string): Promise<LoginResult> {
	return httpSessionPost<LoginResult>('/auth/login', {
		body: { tenantSlug: getTenantSlug(), email, password }
	});
}

/** Ends this session and clears its cookies. */
export function logoutSession(): Promise<LogoutResult> {
	return httpSessionPost<LogoutResult>('/auth/logout', { body: {} });
}

/** Creates the signed-in caller's patient profile; creation only (`409 EC415` for one who has it). */
export function completePatientOnboarding(
	input: AuthIdentitySubmission & { language: string }
): Promise<unknown> {
	return httpSessionPost<unknown>('/patient/onboarding/complete', { body: input });
}

import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	PersonalChallengeFailure,
	PersonalIdKind,
	PersonalWriteFailure
} from '$modules/profile/types';

/**
 * A challenge of the account — the sign-in email's or the mobile's (`start`, `resend`, `verify`) — as its owner module
 * carries it out and reads its refusals. The value typed travels in `start` and nowhere else.
 */
export type PersonalChallengePort = {
	start: (value: string) => Promise<{ alreadyVerified: boolean }>;
	resend: () => Promise<void>;
	verify: (code: string) => Promise<void>;
	failureOf: (error: unknown) => PersonalChallengeFailure;
};

/**
 * What «Προσωπικά στοιχεία» asks of the modules that own each call — the patient's own writes and the mobile's
 * challenge (the appointments module's), the email's challenge (the auth module's), the sign-in's rule for a mobile —
 * composed by the screen: a module imports no other.
 */
export type PersonalPorts = {
	/** `PATCH /patient/me/profile`: the names (both halves) or the date of birth, only what is named. */
	saveProfile: (patch: {
		firstName?: string;
		lastName?: string;
		dateOfBirth?: string;
	}) => Promise<void>;
	/** `PUT /patient/me`: a new ΑΜΚΑ / ΑΦΜ, or `null` to remove it; the other one is left out. */
	saveIdentifier: (kind: PersonalIdKind, value: string | null) => Promise<void>;
	writeFailureOf: (error: unknown) => PersonalWriteFailure;
	email: PersonalChallengePort;
	phone: PersonalChallengePort;
	/** What was typed, with its country, as the E.164 number the server takes; `null` for one it would refuse. */
	toMobilePhone: (dialCode: string, typed: string) => string | null;
	/** The person changed: every read of them is asked again. Resolves once the session's is back; never rejects. */
	refresh: () => Promise<void>;
};

export type PersonalPageProps = {
	locale: SupportedLocale;
	ports: PersonalPorts;
	/** The browser says there is no network: a read with no answer says so at once. */
	offline?: boolean;
};

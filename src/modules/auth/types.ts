import type { SignInAction } from '$shared/state/session';

/** What the entry field reads to: an address or a number, never both (the application's `AuthAccessIdentifier`). */
export type AuthIdentifier = { email: string } | { mobilePhone: string };

export type AuthChannel = 'email' | 'phone';

export type AuthSignInMethod = 'otp' | 'password' | 'google' | 'apple';

export type AuthProvider = 'google' | 'apple';

/**
 * 🔴 What the browser remembers for «Καλωσορίσατε και πάλι» (Π3): the name, the masked identifier and the door used,
 * nothing else. The identifier itself is PII and stays in memory (`19-login/proto-notes.md` Π3, Π4).
 */
export type KnownAccount = {
	firstName: string;
	maskedIdentifier: string;
	channel: AuthChannel;
	lastMethod: AuthSignInMethod;
};

/** The identity fields of the registration and the onboarding (the application's `AuthIdentityValues`). */
export type AuthGender = 'MALE' | 'FEMALE' | 'OTHER';

export type AuthIdentityValues = {
	firstName: string;
	lastName: string;
	/** `YYYY-MM-DD`, empty until chosen. */
	birthDate: string;
	gender: AuthGender | '';
};

export type AuthIdentitySubmission = {
	dateOfBirth: string;
	firstName: string;
	lastName: string;
	gender?: 'MALE' | 'FEMALE' | 'OTHER_GENE';
};

export type AuthLegalAcceptance = {
	context: 'PATIENT';
	acceptances: { accepted: true; documentCode: string; version: string }[];
};

/** The `/login` address's parts, each checked at the boundary. */
export type AuthLoginParams = {
	next: string | null;
	action: SignInAction | null;
	error: AuthProvider | null;
	/** The door of a provider's return: only a return that went well comes back to the way we gave it. */
	via: AuthProvider | null;
};

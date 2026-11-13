import type { SignInAction } from '$shared/state/session';
import type { IoniconName } from '$shared/ui/icons/ionicon';

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

/**
 * Wave 4.5 · screen 59 «Σύνδεση και ασφάλεια» (record §5.4): what the row «Κωδικός πρόσβασης» opens — the change (the
 * current password and the new one) or the mailed code with the new one («Ξέχασα τον κωδικό μου», «Ορισμός»).
 */
export type SecurityPasswordMode = 'change' | 'code';

/**
 * The row «Κωδικός πρόσβασης» as the page prints it: «Έχει οριστεί» / «Δεν έχει οριστεί», the link that opens it and
 * what it opens (`null`, D-W45-39: an account with no sign-in email has no «Ορισμός», and reads `hint` instead), and
 * whether the change offers «Ξέχασα τον κωδικό μου».
 */
export type SecurityPasswordRow = {
	set: boolean;
	value: string;
	opens: SecurityPasswordMode | null;
	actionLabel: string | null;
	hint: string | null;
	canForget: boolean;
};

/** A provider linked to the account: its name, «Συνδεδεμένο», and the words of D-W45-38 for one that may not go. */
export type SecurityProviderRow = {
	provider: 'GOOGLE' | 'APPLE';
	slug: 'google' | 'apple';
	name: string;
	status: string;
	canUnlink: boolean;
	refusal: string;
};

/**
 * A device the account is signed in from: its place in the list (from 0, THIS device first), its glyph, «συσκευή ·
 * browser ή εφαρμογή» composed on the page (D-W45-35), and when it was last active (`null` when the server did not say).
 */
export type SecuritySessionRow = {
	sessionId: string;
	index: number;
	current: boolean;
	icon: IoniconName;
	name: string;
	when: string | null;
};

/** Where the page says a refused write of the password: under one of its fields, or over them all. */
export type SecurityPasswordField = 'current' | 'code' | 'new';

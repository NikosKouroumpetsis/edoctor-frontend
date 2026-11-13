import type { IoniconName } from '$shared/ui/icons/ionicon';

/**
 * A row of the `/profile` page: what it does is the screen's (a page, or a window of the frame) — but «Αποσύνδεση»
 * (`sign-out`, wave 4.5: a member's last row, U-164 Ε3), which is the session's own and the page's to carry out.
 */
export type ProfileMenuRowId =
	| 'relatives'
	| 'account-settings'
	| 'help'
	| 'privacy'
	| 'legal'
	| 'sign-out';

/**
 * Who reads a page of the «Προφίλ», as the session tells it: the page's server knows nobody (U-80.1 Ε6), so until the
 * browser has asked it is the wait — never a guest's page that changes a moment later.
 */
export type ProfileViewer = 'waiting' | 'guest' | 'member';

/**
 * The name card of the «Προφίλ» (D-W45-18): the initial in its circle (`null`: a person's glyph), the main line
 * (`null`: an account the server names nothing for — the glyph alone) and, under it, the sign-in address or mobile as
 * the server hides it (`null`: no second line).
 */
export type ProfileIdentity = {
	initial: string | null;
	title: string | null;
	line: string | null;
};

export type ProfileMenuRow = { id: ProfileMenuRowId; icon: IoniconName; label: string };

export type ProfileMenuSection = { id: 'account' | 'legal'; rows: ProfileMenuRow[] };

/**
 * The sections of «Ρυθμίσεις λογαριασμού» (wave 4.5, screen 57), a closed list in Airbnb's order (record §5.2): 58, 59,
 * 62, 60, 61.
 */
export type SettingsSectionId = 'personal' | 'security' | 'privacy' | 'notifications' | 'language';

/**
 * A page a section opens (wave 4.5, screen 62 — «Απόρρητο» opens three): «Εργαλεία τρίτων και cookies», «Διαγραφή
 * λογαριασμού» and its code step. Each belongs to its section (the menu keeps it selected) and has a «←» of its own.
 */
export type SettingsPageId = 'tools' | 'deletion' | 'deletion-code';

export type SettingsPageSeed = {
	id: SettingsPageId;
	section: SettingsSectionId;
	/** Its address under `/profile` (D-W45-01, the application's words). */
	route: string;
	/** Where its «←» leads: the section itself, or the page before it. */
	back: SettingsPageId | null;
	/** Only a signed-in person reads it (D-W45-30: without a session the deletion's addresses go to `/profile`). */
	member: boolean;
};

export type SettingsSectionSeed = {
	id: SettingsSectionId;
	icon: IoniconName;
	/** Its address under `/profile` (D-W45-01, the application's words). */
	route: string;
	/** Only a signed-in person reads it (D-W45-05: a guest's shell has «Γλώσσα και θέμα» alone). */
	member: boolean;
	/** 🔴 D-W45-02: its screen is built — only then has it an address and a row. */
	built: boolean;
	/**
	 * 🔴 D-W45-29: a GUEST reads it too — never as a row of the guest's shell, but as ONE page of its own at the same
	 * address (below 950 a pushed page; from 950 one column in the middle). Only «Απόρρητο».
	 */
	guestPage?: boolean;
};

/** A section the shell shows, in the page's language; `path` is the site's, not yet in a language. */
export type SettingsSection = {
	id: SettingsSectionId;
	icon: IoniconName;
	label: string;
	path: string;
};

export type ProfileMenuSectionSeed = {
	id: ProfileMenuSection['id'];
	rows: { id: ProfileMenuRowId; icon: IoniconName }[];
};

/** Wave 4.5 · screen 58 «Προσωπικά στοιχεία» (record §5.3): its seven rows, a closed list. */
export type PersonalRowId = 'name' | 'dob' | 'gender' | 'email' | 'phone' | 'amka' | 'afm';

/** A gender as the contract spells it (`GET` / `PUT /user/me`). */
export type PersonalGender = 'FEMALE' | 'MALE' | 'NON_BINARY' | 'OTHER_GENE';

/** The two numbers of the person a row may remove again: the ΑΜΚΑ and the ΑΦΜ. */
export type PersonalIdKind = 'amka' | 'afm';

/**
 * 🔴 U-168: the person as «Προσωπικά στοιχεία» reads them — the names, the gender and the day of birth, and the
 * sign-in address, the mobile, the ΑΜΚΑ and the ΑΦΜ ONLY as the server hides them (`null`: none on file). Without a
 * patient profile (a doctor's account) the server names none of the patient's own, and the page cannot tell whether an
 * address or a mobile exists.
 */
export type PersonalPerson = {
	hasPatientProfile: boolean;
	firstName: string | null;
	lastName: string | null;
	gender: PersonalGender | null;
	/** `YYYY-MM-DD`. */
	birthDate: string | null;
	maskedEmail: string | null;
	maskedPhone: string | null;
	maskedAmka: string | null;
	maskedAfm: string | null;
};

/**
 * A row as the page draws it closed: its title, the line under it — what is on file, «Δεν έχει δοθεί», or `null` where
 * the page cannot know — the line of help it opens with, and whether something is on file («Επεξεργασία») or not
 * («Προσθήκη»).
 */
export type PersonalRow = {
	id: PersonalRowId;
	title: string;
	value: string | null;
	help: string | null;
	filled: boolean;
};

/** Why a write of the person's own details was refused: the session, the date of birth, a value, else. */
export type PersonalWriteFailure = 'session' | 'birth-date' | 'invalid' | 'unknown';

/**
 * Why a step of a challenge (the sign-in email's, the mobile's) was refused: the value is another account's, 🔴 D-W45-16
 * a provider is linked (the email alone), a value or a code the server does not take, a code that is spent, too many
 * tries, the session, else — the general «it did not go through».
 */
export type PersonalChallengeFailure =
	| 'taken'
	| 'provider-google'
	| 'provider-apple'
	| 'provider-both'
	| 'invalid-value'
	| 'invalid-code'
	| 'stale-code'
	| 'rate-limited'
	| 'session'
	| 'unknown';

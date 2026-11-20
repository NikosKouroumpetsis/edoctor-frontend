import type { ApiResponseData } from '$shared/lib/api-client';

/** `GET /doctor/profile/base` as the contract writes it (screen 82 reads the four links of it); it stays inside `api/`. */
export type DoctorLinksView = ApiResponseData<'getDoctorProfileBase', 200>;

/** `PATCH /doctor/profile/base` as the contract answers it; it stays inside `api/`. */
export type DoctorLinksAnswerView = ApiResponseData<'updateDoctorProfileBase', 200>;

/** 🔴 U-211.2 (Ε1 = Α): the four links the server keeps for a doctor's page — no other network exists. */
export type DoctorLinkField = 'website' | 'facebook' | 'instagram' | 'linkedin';

/**
 * FACTS of «Κοινωνικά δίκτυα» (D-W52-70, screen 82): each link as the server keeps it — plain text — or `null` for
 * none. Nothing else of the base profile is kept (no email, no phone, no licence, no policy of the bookings).
 */
export type DoctorLinksFacts = Record<DoctorLinkField, string | null>;

/**
 * Why the server refuses ONE link (D-W52-67, the server's own `DoctorSocialLinkRefusal`): longer than it keeps; no
 * link at all; another scheme than `https`; a name or a password inside; a link of another site in the field of a
 * network; a website on an address that is no public name.
 */
export type DoctorLinkRefusal =
	| 'TOO_LONG'
	| 'NOT_A_LINK'
	| 'NOT_HTTPS'
	| 'HAS_CREDENTIALS'
	| 'NOT_OF_NETWORK'
	| 'NOT_A_PUBLIC_HOST';

/**
 * Why the server refused a save of the links (`w52-b6` §5): the session ended; a `422` (`invalid`) — with `fields`
 * naming each link it refused and why, when it names any; the doctor's record is being written elsewhere
 * (`conflict`); too many writes; no licence; else nobody decided.
 */
export type DoctorLinksFailure = {
	reason: 'session' | 'invalid' | 'conflict' | 'rate-limited' | 'forbidden' | 'unknown';
	fields: Partial<Record<DoctorLinkField, DoctorLinkRefusal>>;
};

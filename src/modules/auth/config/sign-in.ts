/**
 * The documents a patient registration accepts, paired with the CMS page each is published as (the application's
 * `authLegalDocuments`): the version is always read from the page, never kept here.
 */
export const authLegalDocuments = [
	{ documentCode: 'CORE_TERMS_OF_USE', slug: 'terms-of-use' },
	{ documentCode: 'CORE_PRIVACY_POLICY', slug: 'privacy-policy' }
] as const;

/** U-65.6: the limits of every field (the backend's own, `19-login/proto-notes.md` §Backend 2). */
export const authFieldLimits = {
	identifier: 254,
	name: 100,
	password: 128,
	code: 6
} as const;

/**
 * The backend's lifetimes, mirrored so the flow stops offering what the server would refuse (the application's
 * `lib/flow-state`): the resend spacing, how long a sent code can be verified, how long a ticket can be spent.
 */
export const authFlowLifetimes = {
	resendCooldownMs: 60_000,
	challengeMs: 10 * 60_000,
	ticketMs: 15 * 60_000
} as const;

export const authCodeLength = 6;

export const authPasswordMinimumLength = 8;

import { browser } from '$app/environment';
import { knownAccountStorageKey, authReturnStorageKey } from '$shared/config/env';
import type { SignInAction } from '$shared/state/session';
import type { AuthChannel, AuthSignInMethod, KnownAccount } from '$modules/auth/types';
import { sanitizeStoredReturn } from '$modules/auth/lib/return-path';

// Long enough for any real name or mask, short enough that a tampered record cannot grow what the step draws.
const MAX_FIELD_LENGTH = 120;
const channels: readonly AuthChannel[] = ['email', 'phone'];
const methods: readonly AuthSignInMethod[] = ['otp', 'password', 'google', 'apple'];

const text = (value: unknown) =>
	typeof value === 'string' && value.trim() && value.length <= MAX_FIELD_LENGTH
		? value.trim()
		: null;

/** A stored memory, checked: anything missing, oversized or unknown is no memory; an identifier is never read. */
export function sanitizeKnownAccount(value: unknown): KnownAccount | null {
	if (!value || typeof value !== 'object') return null;
	const candidate = value as Record<string, unknown>;
	const firstName = text(candidate.firstName);
	const maskedIdentifier = text(candidate.maskedIdentifier);
	if (!firstName || !maskedIdentifier || !maskedIdentifier.includes('***')) return null;
	const channel = channels.find((entry) => entry === candidate.channel);
	if (!channel) return null;
	return {
		firstName,
		maskedIdentifier,
		channel,
		lastMethod: methods.find((entry) => entry === candidate.lastMethod) ?? 'otp'
	};
}

export function readKnownAccount(): KnownAccount | null {
	if (!browser) return null;
	try {
		const stored = window.localStorage.getItem(knownAccountStorageKey);
		return stored ? sanitizeKnownAccount(JSON.parse(stored)) : null;
	} catch {
		return null;
	}
}

export function writeKnownAccount(account: KnownAccount) {
	if (!browser) return;
	const sanitized = sanitizeKnownAccount(account);
	if (!sanitized) return;
	try {
		window.localStorage.setItem(knownAccountStorageKey, JSON.stringify(sanitized));
	} catch {
		return;
	}
}

/**
 * Wave 4.5 · screen 58 (card w45-w5 §3): the sign-in email changed — a memory that greets the person by an EMAIL keeps
 * the new address as the SERVER hides it (U-168: the device never held the whole one), the way a sign-in writes it; a
 * memory by a mobile, no memory, or an answer that is no mask stay as they are.
 */
export function renameKnownAccountEmail(maskedEmail: string | null) {
	const known = readKnownAccount();
	if (!known || known.channel !== 'email' || !maskedEmail) return;
	writeKnownAccount({ ...known, maskedIdentifier: maskedEmail });
}

/**
 * 🔴 D-W45-30 (wave 4.5, screen 62): the account was deleted — «Καλωσορίσατε» must not greet it by name on this device
 * again, so its memory goes (the application's `forgetAccount`).
 */
export function forgetKnownAccount() {
	if (!browser) return;
	try {
		window.localStorage.removeItem(knownAccountStorageKey);
	} catch {
		return;
	}
}

/** Π4: what waits in the tab while a provider's redirect runs — the action and the path only, nothing personal. */
export function writePendingReturn(pending: { next: string | null; action: SignInAction | null }) {
	if (!browser) return;
	try {
		window.sessionStorage.setItem(authReturnStorageKey, JSON.stringify(pending));
	} catch {
		return;
	}
}

/** Reads and clears it: it runs once. */
export function takePendingReturn(): { next: string | null; action: SignInAction | null } | null {
	if (!browser) return null;
	try {
		const stored = window.sessionStorage.getItem(authReturnStorageKey);
		window.sessionStorage.removeItem(authReturnStorageKey);
		return stored ? sanitizeStoredReturn(JSON.parse(stored)) : null;
	} catch {
		return null;
	}
}

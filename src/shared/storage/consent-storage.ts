import { browser } from '$app/environment';
import { consentStorageKey } from '$shared/config/env';

/** The tracking decision this browser keeps (the application's `ConsentSnapshot`): no personal data, no date. */
export type ConsentSnapshot = {
	registryVersion: string;
	choices: Record<string, boolean>;
};

// A registry tool id as the backend may ever spell one; anything else in a stored payload was not written here.
const TOOL_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const MAX_STORED_CHOICES = 100;

/**
 * Validates a stored decision (the application's `sanitizeConsentSnapshot`): `null` when it is corrupt or was not
 * written by this site, so the card asks again; unknown or oversized `choices` entries are dropped one by one.
 */
export function sanitizeConsentSnapshot(value: unknown): ConsentSnapshot | null {
	if (!value || typeof value !== 'object') return null;
	const candidate = value as Partial<ConsentSnapshot>;
	if (typeof candidate.registryVersion !== 'string' || candidate.registryVersion.length === 0) {
		return null;
	}
	if (
		!candidate.choices ||
		typeof candidate.choices !== 'object' ||
		Array.isArray(candidate.choices)
	) {
		return null;
	}
	const choices: Record<string, boolean> = {};
	for (const [toolId, allowed] of Object.entries(candidate.choices).slice(0, MAX_STORED_CHOICES)) {
		if (typeof allowed === 'boolean' && TOOL_ID_PATTERN.test(toolId)) choices[toolId] = allowed;
	}
	return { registryVersion: candidate.registryVersion, choices };
}

/**
 * The stored decision, first-party only (`edoctor.<appEnv>.consent.v1`). A browser that blocks storage or a
 * malformed value yields `null`: the card asks again.
 */
export function readConsentSnapshot(): ConsentSnapshot | null {
	if (!browser) return null;
	try {
		const stored = window.localStorage.getItem(consentStorageKey);
		return stored ? sanitizeConsentSnapshot(JSON.parse(stored)) : null;
	} catch {
		return null;
	}
}

/** Keeps the sanitized decision; when the browser blocks storage nothing is thrown (asked again next visit). */
export function writeConsentSnapshot(snapshot: ConsentSnapshot) {
	if (!browser) return;
	const sanitized = sanitizeConsentSnapshot(snapshot);
	if (!sanitized) return;
	try {
		window.localStorage.setItem(consentStorageKey, JSON.stringify(sanitized));
	} catch {
		return;
	}
}

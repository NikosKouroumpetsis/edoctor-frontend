import { browser } from '$app/environment';
import { preferencesStorageKey } from '$shared/config/env';

export type ThemePreference = 'light' | 'dark' | 'system';
export type LanguagePreference = 'system' | 'el' | 'en';

export interface PreferencesSnapshot {
	themePreference?: ThemePreference;
	languagePreference?: LanguagePreference;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const isThemePreference = (value: unknown): value is ThemePreference =>
	value === 'light' || value === 'dark' || value === 'system';

const isLanguagePreference = (value: unknown): value is LanguagePreference =>
	value === 'system' || value === 'el' || value === 'en';

export function sanitizePreferencesSnapshot(value: unknown): PreferencesSnapshot {
	if (!isRecord(value)) return {};

	return {
		...(isThemePreference(value.themePreference) ? { themePreference: value.themePreference } : {}),
		...(isLanguagePreference(value.languagePreference)
			? { languagePreference: value.languagePreference }
			: {})
	};
}

export function readPreferencesSnapshot(): PreferencesSnapshot {
	if (!browser) return {};

	const stored = window.localStorage.getItem(preferencesStorageKey);
	if (!stored) return {};

	try {
		return sanitizePreferencesSnapshot(JSON.parse(stored));
	} catch {
		return {};
	}
}

export function writePreferencesSnapshot(snapshot: PreferencesSnapshot) {
	if (!browser) return;

	const sanitized = sanitizePreferencesSnapshot(snapshot);
	window.localStorage.setItem(preferencesStorageKey, JSON.stringify(sanitized));
}

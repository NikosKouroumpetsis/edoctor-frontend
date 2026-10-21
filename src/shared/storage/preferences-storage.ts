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

/**
 * Reads the saved snapshot. A browser that blocks storage (all cookies blocked, storage
 * disabled) or a malformed value yields the empty snapshot, i.e. the system preferences,
 * like the pre-paint script in `src/app.html`.
 */
export function readPreferencesSnapshot(): PreferencesSnapshot {
	if (!browser) return {};

	try {
		const stored = window.localStorage.getItem(preferencesStorageKey);

		return stored ? sanitizePreferencesSnapshot(JSON.parse(stored)) : {};
	} catch {
		return {};
	}
}

/**
 * Saves the sanitized snapshot. When the browser blocks storage the preference is kept
 * only until the next full page load and nothing is thrown, so the theme still switches.
 */
export function writePreferencesSnapshot(snapshot: PreferencesSnapshot) {
	if (!browser) return;

	const sanitized = sanitizePreferencesSnapshot(snapshot);

	try {
		window.localStorage.setItem(preferencesStorageKey, JSON.stringify(sanitized));
	} catch {
		return;
	}
}

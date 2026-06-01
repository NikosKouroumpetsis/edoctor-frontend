import { browser } from '$app/environment';
import {
	readPreferencesSnapshot,
	writePreferencesSnapshot
} from '$shared/storage/preferences-storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const systemQuery = '(prefers-color-scheme: dark)';

class ThemeState {
	preference = $state<ThemePreference>('system');
	resolved = $state<ResolvedTheme>('light');

	#initialized = false;
	#media: MediaQueryList | undefined;

	init() {
		if (!browser || this.#initialized) return;

		this.#initialized = true;
		this.#media = window.matchMedia(systemQuery);
		this.preference = this.#readPreference();
		this.#media.addEventListener('change', this.#handleSystemChange);
		this.#apply();
	}

	set(preference: ThemePreference) {
		this.preference = preference;

		if (!browser) return;

		writePreferencesSnapshot({
			...readPreferencesSnapshot(),
			themePreference: preference
		});
		this.#apply();
	}

	#readPreference(): ThemePreference {
		return readPreferencesSnapshot().themePreference ?? 'system';
	}

	#handleSystemChange = () => {
		if (this.preference === 'system') this.#apply();
	};

	#apply() {
		const prefersDark = this.#media?.matches ?? false;
		const isDark = this.preference === 'dark' || (this.preference === 'system' && prefersDark);

		this.resolved = isDark ? 'dark' : 'light';
		document.documentElement.classList.toggle('dark', isDark);
		document.documentElement.dataset.theme = this.preference;
	}
}

export const theme = new ThemeState();

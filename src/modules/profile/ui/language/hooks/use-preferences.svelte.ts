import { goto } from '$app/navigation';
import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { theme, type ThemePreference } from '$shared/preferences/theme';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { languageName } from '../lib/options';
import type { LanguagePageProps, PreferenceRowId } from '../types';
import { useAccountLocale } from './use-account-locale.svelte';

/**
 * Screen 61 (record §5.6): which row is open, and what a choice does — it holds at the press and the row closes; the
 * same choice again closes it with nothing said. The language goes to this same page in the other language (the way of
 * the frame's `LanguageSwitcher`), after the account's write for a signed-in person (D-W45-06), and says so in the NEW
 * language once there; the theme changes in place.
 */
export function usePreferences(props: () => LanguagePageProps) {
	const toasts = getToastsOptional();
	const account = useAccountLocale({ enabled: () => props().member });
	let openRow = $state<PreferenceRowId | null>(null);
	let changing = $state(false);

	async function chooseLanguage(next: SupportedLocale) {
		openRow = null;
		const { locale, languageHref } = props();
		if (next === locale || changing) return;
		changing = true;
		try {
			await account.keep(next);
			// The screen's address, already resolved (a module knows no route); the row's link keeps the focus.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto(languageHref(next), { noScroll: true, keepFocus: true });
			const options = { locale: next };
			toasts?.show({
				message: m.profile_account_settings_language_changed(
					{ language: languageName(next) },
					options
				)
			});
		} catch {
			// Another navigation took this one's place: the page says nothing of a change it did not make.
		} finally {
			changing = false;
		}
	}

	function chooseTheme(next: ThemePreference) {
		openRow = null;
		if (next === theme.preference) return;
		theme.set(next);
		toasts?.show({
			message: m.profile_account_settings_theme_changed({}, { locale: props().locale })
		});
	}

	return {
		get openRow() {
			return openRow;
		},
		/** The language is on its way (the account's write, then the page): no row opens meanwhile. */
		get changing() {
			return changing;
		},
		setOpen(row: PreferenceRowId, open: boolean) {
			if (open) openRow = row;
			else if (openRow === row) openRow = null;
		},
		chooseLanguage,
		chooseTheme
	};
}

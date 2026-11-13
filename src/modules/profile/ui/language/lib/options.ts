import { m } from '$paraglide/messages.js';
import { languages, type SupportedLocale } from '$shared/preferences/i18n/locales';
import type { ThemePreference } from '$shared/preferences/theme';
import type { PreferenceOption } from '../types';

type MessageOptions = { locale: SupportedLocale };

const themeNames: Record<ThemePreference, (options: MessageOptions) => string> = {
	system: (options) => m.common_system({}, options),
	light: (options) => m.common_light({}, options),
	dark: (options) => m.common_dark({}, options)
};

/** 🔴 D-W45-03: the theme's three choices, in the prototype's order — «Σύστημα» first. */
const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/** A language's own name («Ελληνικά», «English»), the same in every language of the page, as the application's. */
export function languageName(locale: SupportedLocale): string {
	return languages.find((language) => language.locale === locale)?.label ?? locale;
}

/** A theme's name in the page's language («Σύστημα», «Φωτεινό», «Σκούρο»). */
export function themeName(preference: ThemePreference, options: MessageOptions): string {
	return themeNames[preference](options);
}

/** 🔴 D-W45-03: the language's choices are the site's two — «Σύστημα» is no row of the language. */
export function buildLanguageOptions(): PreferenceOption<SupportedLocale>[] {
	return languages.map(({ locale }) => ({ value: locale, label: languageName(locale) }));
}

export function buildThemeOptions(options: MessageOptions): PreferenceOption<ThemePreference>[] {
	return THEMES.map((value) => ({ value, label: themeName(value, options) }));
}

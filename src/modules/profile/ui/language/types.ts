import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The two rows of «Γλώσσα και θέμα» (wave 4.5, screen 61). */
export type PreferenceRowId = 'language' | 'theme';

/** One choice of a row: its value as the code keeps it, and its name in the page's language. */
export type PreferenceOption<Value extends string = string> = { value: Value; label: string };

export type LanguagePageProps = {
	locale: SupportedLocale;
	/** A signed-in person: the language is the account's too (its emails and SMS, D-W45-06); a guest's stays on the device. */
	member: boolean;
	/** This same page in a language, resolved by the screen (a module knows no route). */
	languageHref: (locale: SupportedLocale) => string;
};

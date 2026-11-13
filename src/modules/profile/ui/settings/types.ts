import type { Snippet } from 'svelte';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { SettingsPageId, SettingsSectionId } from '$modules/profile/types';

/** Every address the shell leads to, resolved by the screen in the page's language (a module knows no route). */
export type SettingsLinks = {
	/** «←» of the list: the «Προφίλ» tab. */
	profile: string;
	/** «←» of a section below 950: the shell's own address, its list. */
	list: string;
	section: (section: SettingsSectionId) => string;
	/** A page a section opens (screen 62): «←» of the page after it. */
	page: (page: SettingsPageId) => string;
};

/** A page a section opens, drawn by the screen: its title (the shell draws it, with the «←») and what is under it. */
export type SettingsPageContent = { title: string; content: Snippet };

export type SettingsPageProps = {
	locale: SupportedLocale;
	/** The section the address names; `null` on the shell's own address (its list; from 950 its first section). */
	section: SettingsSectionId | null;
	/** The page of that section the address names (screen 62), `null` for the section itself. */
	page?: SettingsPageId | null;
	links: SettingsLinks;
	/** This same page in a language (the language's choice goes there). */
	languageHref: (locale: SupportedLocale) => string;
	/**
	 * The sections the SCREEN draws — one whose screen another module owns («Ειδοποιήσεις», screen 60), or one that
	 * needs what only the screen can compose («Απόρρητο», screen 62) — a module never imports another; the shell gives
	 * each its place, its title and its «←».
	 */
	sectionContent?: Partial<Record<SettingsSectionId, Snippet>>;
	/** The pages a section opens (screen 62), drawn by the screen the same way. */
	pageContent?: Partial<Record<SettingsPageId, SettingsPageContent>>;
};

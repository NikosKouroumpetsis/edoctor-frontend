import { m } from '$paraglide/messages.js';
import { settingsPages, settingsSections } from '$modules/profile/config/settings';
import { settingsSectionPath } from '$modules/profile/lib/paths';
import type {
	SettingsPageId,
	SettingsPageSeed,
	SettingsSection,
	SettingsSectionId,
	SettingsSectionSeed
} from '$modules/profile/types';

type MessageOptions = { locale: 'el' | 'en' };

const sectionLabels: Record<SettingsSectionId, (options: MessageOptions) => string> = {
	personal: (options) => m.profile_account_settings_sections_personal({}, options),
	security: (options) => m.profile_account_settings_sections_security({}, options),
	privacy: (options) => m.profile_menu_privacy({}, options),
	notifications: (options) => m.profile_account_settings_sections_notifications({}, options),
	language: (options) => m.profile_account_settings_sections_language({}, options)
};

/** A section's name in the page's language (the row, the section's title). */
export function settingsSectionLabel(section: SettingsSectionId, options: MessageOptions): string {
	return sectionLabels[section](options);
}

const toSection = (seed: SettingsSectionSeed, options: MessageOptions): SettingsSection => ({
	id: seed.id,
	icon: seed.icon,
	label: settingsSectionLabel(seed.id, options),
	path: settingsSectionPath(seed.id)
});

/**
 * The sections «Ρυθμίσεις λογαριασμού» shows, in the register's order and the page's language. 🔴 D-W45-02: only those
 * whose screen is built — no row leads to an empty page. 🔴 D-W45-05: a guest reads only what needs no account
 * («Γλώσσα και θέμα»).
 */
export function buildSettingsSections(
	options: MessageOptions,
	{ member }: { member: boolean }
): SettingsSection[] {
	return settingsSections
		.filter((seed) => seed.built && (member || !seed.member))
		.map((seed) => toSection(seed, options));
}

/**
 * 🔴 D-W45-29 (screen 62): the section a GUEST reads as a page of its own — «Απόρρητο», from the row of the «Προφίλ» —
 * though it is no row of the guest's shell; `null` for every other section (those ask for the sign-in, or are a 404).
 */
export function buildGuestPage(
	section: SettingsSectionId | null,
	options: MessageOptions
): SettingsSection | null {
	const seed = settingsSections.find(
		(entry) => entry.id === section && entry.built && entry.guestPage === true
	);
	return seed ? toSection(seed, options) : null;
}

/** A page a section opens, from the closed list (D-W45-01); `null` for none. */
export function settingsPageOf(page: SettingsPageId | null | undefined): SettingsPageSeed | null {
	return settingsPages.find((seed) => seed.id === page) ?? null;
}

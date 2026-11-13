import type { SettingsPageSeed, SettingsSectionSeed } from '$modules/profile/types';

/**
 * 🔴 D-W45-02 (wave 4.5, screen 57): the closed register of the sections of «Ρυθμίσεις λογαριασμού», in their fixed
 * order (record §5.2, Airbnb's): each with the application's glyph, its address under `/profile` (D-W45-01), whether
 * only a signed-in person reads it (D-W45-05) and whether its screen is BUILT. A section enters the shell — a row, an
 * address — the day its screen is built: until then it is an id here and a 404 on the site, never a row to an empty page.
 */
export const settingsSections: readonly SettingsSectionSeed[] = [
	{
		id: 'personal',
		icon: 'person-outline',
		route: 'account-settings/personal',
		member: true,
		built: true
	},
	{
		id: 'security',
		icon: 'shield-outline',
		route: 'account-settings/security',
		member: true,
		built: true
	},
	{
		id: 'privacy',
		icon: 'hand-left-outline',
		route: 'privacy',
		member: true,
		built: true,
		guestPage: true
	},
	{
		id: 'notifications',
		icon: 'notifications-outline',
		route: 'account-settings/notifications',
		member: true,
		built: true
	},
	{
		id: 'language',
		icon: 'globe-outline',
		route: 'account-settings/language',
		member: false,
		built: true
	}
];

/**
 * 🔴 D-W45-01 (wave 4.5, screen 62): the closed list of the pages a section opens, at the application's addresses —
 * «Εργαλεία τρίτων και cookies», «Διαγραφή λογαριασμού» and its code. All three are «Απόρρητο»'s. The deletion's two
 * need a session (D-W45-30); the tools a guest reads too (D-W45-29).
 */
export const settingsPages: readonly SettingsPageSeed[] = [
	{ id: 'tools', section: 'privacy', route: 'third-party-tools', back: null, member: false },
	{
		id: 'deletion',
		section: 'privacy',
		route: 'account-settings/deletion',
		back: null,
		member: true
	},
	{
		id: 'deletion-code',
		section: 'privacy',
		route: 'account-settings/deletion/code',
		back: 'deletion',
		member: true
	}
];

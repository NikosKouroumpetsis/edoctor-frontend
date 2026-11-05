import type { ProfileMenuSectionSeed } from '$modules/profile/types';

/**
 * The application's account menu (`modules/profile/config/guest-menu`), the same rows in the same order. 🔴 U-82.2: the
 * rows with no page on the web in this wave («Οι συγγενείς μου», «Ραντεβού γιατρού», «Ταμείο») are hidden here; the
 * application keeps them.
 */
export const profileMenuSections: readonly ProfileMenuSectionSeed[] = [
	{
		id: 'account',
		rows: [
			{ id: 'account-settings', icon: 'settings-outline' },
			{ id: 'help', icon: 'help-circle-outline' },
			{ id: 'privacy', icon: 'hand-left-outline' }
		]
	},
	{
		id: 'legal',
		rows: [{ id: 'legal', icon: 'document-text-outline' }]
	}
];

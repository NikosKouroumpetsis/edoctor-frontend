import type { IoniconName } from '$shared/ui/icons/ionicon';
import type { ProfileMenuRowId, ProfileMenuSectionSeed } from '$modules/profile/types';

/**
 * The application's account menu (`modules/profile/config/guest-menu`), the same rows in the same order. 🔴 U-82.2: the
 * rows with no page on the web («Ραντεβού γιατρού», «Ταμείο») are hidden here; the application keeps them. D-W4-56:
 * «Οι συγγενείς μου» has its page since wave 4.0 (screen 55), so it shows — for a member only, as the application's
 * `buildProfileMenuSections` adds it (`profileRelativesRow`, first in «account»).
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

/** D-W4-56: «Οι συγγενείς μου», the application's row (`people-outline`), only where a session is. */
export const profileRelativesRow = { id: 'relatives', icon: 'people-outline' } as const satisfies {
	id: ProfileMenuRowId;
	icon: IoniconName;
};

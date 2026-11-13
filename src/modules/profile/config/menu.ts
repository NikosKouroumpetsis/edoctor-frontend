import type { IoniconName } from '$shared/ui/icons/ionicon';
import type { ProfileMenuRowId, ProfileMenuSectionSeed } from '$modules/profile/types';

/**
 * The application's account menu (`modules/profile/config/guest-menu`), the same rows in the same order. 🔴 U-82.2: the
 * rows with no page on the web («Ραντεβού γιατρού», «Ταμείο») are hidden here; the application keeps them. D-W4-56:
 * «Οι συγγενείς μου» has its page since wave 4.0 (screen 55), so it shows — for a member only. Wave 4.5 (screen 56,
 * record §5.1): a member reads Ρυθμίσεις λογαριασμού · Οι συγγενείς μου · Βρείτε βοήθεια · Απόρρητο · — · Νομικά ·
 * Αποσύνδεση (`buildProfileMenu` adds the two a session brings). 🔴 U-164.1: no row of a doctor's, ever.
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

/**
 * Wave 4.5 · screen 56 (U-164 Ε3, record §5.1): «Αποσύνδεση», a member's LAST row — after «Νομικά», with no «›» — in the
 * place of the big button the tab had.
 */
export const profileSignOutRow = { id: 'sign-out', icon: 'log-out-outline' } as const satisfies {
	id: ProfileMenuRowId;
	icon: IoniconName;
};

/** D-W4-56: «Οι συγγενείς μου», the application's row (`people-outline`), only where a session is. */
export const profileRelativesRow = { id: 'relatives', icon: 'people-outline' } as const satisfies {
	id: ProfileMenuRowId;
	icon: IoniconName;
};

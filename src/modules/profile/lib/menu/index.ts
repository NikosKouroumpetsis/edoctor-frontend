import { m } from '$paraglide/messages.js';
import { profileMenuSections, profileRelativesRow } from '$modules/profile/config/menu';
import type { ProfileMenuRowId, ProfileMenuSection } from '$modules/profile/types';

type MessageOptions = { locale: 'el' | 'en' };

const rowLabels: Record<ProfileMenuRowId, (options: MessageOptions) => string> = {
	relatives: (options) => m.profile_menu_relatives({}, options),
	'account-settings': (options) => m.profile_menu_account_settings({}, options),
	help: (options) => m.profile_menu_help({}, options),
	privacy: (options) => m.profile_menu_privacy({}, options),
	legal: (options) => m.profile_menu_legal({}, options)
};

/**
 * The page's sections in the page's language (U-82.2). D-W4-56: a member reads «Οι συγγενείς μου» first in «account»,
 * where the application puts it (`buildProfileMenuSections`, `hasRelatives`); a guest reads the same rows as before.
 */
export function buildProfileMenu(
	options: MessageOptions,
	{ member }: { member: boolean } = { member: false }
): ProfileMenuSection[] {
	return profileMenuSections.map((section) => ({
		id: section.id,
		rows: [
			...(member && section.id === 'account' ? [profileRelativesRow] : []),
			...section.rows
		].map((row) => ({ ...row, label: rowLabels[row.id](options) }))
	}));
}

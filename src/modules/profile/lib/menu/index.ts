import { m } from '$paraglide/messages.js';
import { profileMenuSections } from '$modules/profile/config/menu';
import type { ProfileMenuRowId, ProfileMenuSection } from '$modules/profile/types';

type MessageOptions = { locale: 'el' | 'en' };

const rowLabels: Record<ProfileMenuRowId, (options: MessageOptions) => string> = {
	'account-settings': (options) => m.profile_menu_account_settings({}, options),
	help: (options) => m.profile_menu_help({}, options),
	privacy: (options) => m.profile_menu_privacy({}, options),
	legal: (options) => m.profile_menu_legal({}, options)
};

/** The page's sections in the page's language; a guest and a member read the same (U-82.2). */
export function buildProfileMenu(options: MessageOptions): ProfileMenuSection[] {
	return profileMenuSections.map((section) => ({
		id: section.id,
		rows: section.rows.map((row) => ({ ...row, label: rowLabels[row.id](options) }))
	}));
}

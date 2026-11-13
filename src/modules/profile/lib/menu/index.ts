import { m } from '$paraglide/messages.js';
import {
	profileMenuSections,
	profileRelativesRow,
	profileSignOutRow
} from '$modules/profile/config/menu';
import type { ProfileMenuRowId, ProfileMenuSection } from '$modules/profile/types';

type MessageOptions = { locale: 'el' | 'en' };

const rowLabels: Record<ProfileMenuRowId, (options: MessageOptions) => string> = {
	relatives: (options) => m.profile_menu_relatives({}, options),
	'account-settings': (options) => m.profile_menu_account_settings({}, options),
	help: (options) => m.profile_menu_help({}, options),
	privacy: (options) => m.profile_menu_privacy({}, options),
	legal: (options) => m.profile_menu_legal({}, options),
	'sign-out': (options) => m.profile_sign_out({}, options)
};

/**
 * The page's sections in the page's language (U-82.2). Wave 4.5 · screen 56 (record §5.1): a member reads «Οι συγγενείς
 * μου» right after «Ρυθμίσεις λογαριασμού» (D-W4-56: only where a session is) and «Αποσύνδεση» as the LAST row, after
 * «Νομικά» (U-164 Ε3); a guest reads neither.
 */
export function buildProfileMenu(
	options: MessageOptions,
	{ member }: { member: boolean } = { member: false }
): ProfileMenuSection[] {
	return profileMenuSections.map((section) => ({
		id: section.id,
		rows: [
			...section.rows.flatMap((row) =>
				member && row.id === 'account-settings' ? [row, profileRelativesRow] : [row]
			),
			...(member && section.id === 'legal' ? [profileSignOutRow] : [])
		].map((row) => ({ ...row, label: rowLabels[row.id](options) }))
	}));
}

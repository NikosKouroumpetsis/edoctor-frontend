import { m } from '$paraglide/messages.js';
import type { IoniconName } from '$shared/ui/icons/ionicon';

type Locale = 'el' | 'en';

/**
 * The doctor menu's rows on the web in 5.1 (D-W51-04, D-W51-16, `76-menu` `?stage=51`): «Ειδοποιήσεις» (the doctor's
 * own list since step 11, screen 75) · «Οι ασθενείς μου» (screen 73, since step 9: D-W51-73) · «Ρυθμίσεις λογαριασμού» (the shared 57) ·
 * «Κέντρο βοήθειας» · «Όροι γιατρών» · «Αποσύνδεση». No «Ρυθμίσεις ιατρείου» (the web has none of the old screens),
 * never «Οι συγγενείς μου» (U-186.1) and never «Το προφίλ μου» / «Ταμείο» here in 5.1. «Λειτουργία ασθενή» is not a
 * row: the bar has it from 1128, the ☰ below it, the page's pill below 744.
 */
export type DoctorMenuRowId =
	| 'notifications'
	| 'patients'
	| 'account-settings'
	| 'help'
	| 'terms'
	| 'sign-out';

export type DoctorMenuRow = { id: DoctorMenuRowId; label: string; icon: IoniconName };

/**
 * Where the rows stand: the ☰ of the bar from 744 (`menu`), or the page «Μενού» (`page`, the application's tab below 744,
 * U-81.2; `76-menu` `m-51`): the page has the bell at its title instead of the row «Ειδοποιήσεις», and the «Προφίλ»'s
 * words for the help («Βρείτε βοήθεια», as the web's «Προφίλ» at 402); the ☰ keeps the bar's («Κέντρο βοήθειας»).
 */
export type DoctorMenuPlace = 'menu' | 'page';

/** The rows in their groups (a rule between two groups), the prototype's order. */
export function buildDoctorMenuGroups(
	locale: Locale,
	place: DoctorMenuPlace = 'menu'
): DoctorMenuRow[][] {
	const options = { locale };
	const settings: DoctorMenuRow[] = [
		{
			id: 'account-settings',
			label: m.profile_menu_account_settings({}, options),
			icon: 'settings-outline'
		}
	];
	const help: DoctorMenuRow[] = [
		{
			id: 'help',
			label: place === 'page' ? m.profile_menu_help({}, options) : m.nav_help({}, options),
			icon: 'help-circle-outline'
		},
		{ id: 'terms', label: m.doctor_dashboard_terms({}, options), icon: 'document-text-outline' }
	];
	const signOut: DoctorMenuRow[] = [
		{ id: 'sign-out', label: m.account_menu_sign_out({}, options), icon: 'log-out-outline' }
	];
	// 🔴 D-W51-73 (`76-menu` `?stage=51`: «Οι ασθενείς μου» the first group of the page, «also on the web in 5.1»).
	const patients: DoctorMenuRow[] = [
		{ id: 'patients', label: m.doctor_patients_title({}, options), icon: 'people-outline' }
	];
	const notifications: DoctorMenuRow[] = [
		{
			id: 'notifications',
			label: m.notifications_inbox_bell_label({}, options),
			icon: 'notifications-outline'
		}
	];
	return place === 'page'
		? [patients, settings, help, signOut]
		: [notifications, patients, settings, help, signOut];
}

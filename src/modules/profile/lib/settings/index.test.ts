import { describe, expect, it } from 'vitest';
import { settingsSections } from '$modules/profile/config/settings';
import { readProfileAddress } from '$modules/profile/lib/paths';
import { ioniconNames } from '$shared/ui/icons/ionicon';
import { buildGuestPage, buildSettingsSections, settingsPageOf, settingsSectionLabel } from '.';

const el = { locale: 'el' } as const;
const en = { locale: 'en' } as const;

describe('modules/profile · the register of «Ρυθμίσεις λογαριασμού» (wave 4.5, screen 57)', () => {
	it('record §5.2: the five sections in Airbnb’s fixed order, each with the application’s glyph and its address of D-W45-01', () => {
		expect(settingsSections.map((section) => [section.id, section.icon, section.route])).toEqual([
			['personal', 'person-outline', 'account-settings/personal'],
			['security', 'shield-outline', 'account-settings/security'],
			['privacy', 'hand-left-outline', 'privacy'],
			['notifications', 'notifications-outline', 'account-settings/notifications'],
			['language', 'globe-outline', 'account-settings/language']
		]);
		for (const section of settingsSections) expect(ioniconNames).toContain(section.icon);
	});

	it('U-140: the five names as the approved prototype writes them, and in English', () => {
		const names = (options: typeof el | typeof en) =>
			settingsSections.map((section) => settingsSectionLabel(section.id, options));
		expect(names(el)).toEqual([
			'Προσωπικά στοιχεία',
			'Σύνδεση και ασφάλεια',
			'Απόρρητο',
			'Ειδοποιήσεις',
			'Γλώσσα και θέμα'
		]);
		expect(names(en)).toEqual([
			'Personal details',
			'Sign-in and security',
			'Privacy',
			'Notifications',
			'Language and theme'
		]);
	});

	// Rewrites «…today «Γλώσσα και θέμα» alone, for a member too» of card w45-w1: card w45-w3 built «Ειδοποιήσεις»
	// (screen 60, the task doc's step 4) and card w45-w4 «Απόρρητο» (screen 62, step 5). The decision D-W45-02 did not
	// change: a row only for a section that is built.
	// … and card w45-w5 «Προσωπικά στοιχεία» (screen 58, step 6): since then it is the FIRST row (rule 8 of the card).
	// … and card w45-w6 «Σύνδεση και ασφάλεια» (screen 59, step 7), the second row: all five sections are built.
	it('🔴 D-W45-02: το κέλυφος δείχνει μόνο ενότητες με σελίδα — today «Προσωπικά στοιχεία», «Σύνδεση και ασφάλεια», «Απόρρητο», «Ειδοποιήσεις» and «Γλώσσα και θέμα» for a member, in the register’s order; every row shown has an address the route reads', () => {
		const member = buildSettingsSections(el, { member: true });
		expect(member).toEqual([
			{
				id: 'personal',
				icon: 'person-outline',
				label: 'Προσωπικά στοιχεία',
				path: '/profile/account-settings/personal'
			},
			{
				id: 'security',
				icon: 'shield-outline',
				label: 'Σύνδεση και ασφάλεια',
				path: '/profile/account-settings/security'
			},
			{
				id: 'privacy',
				icon: 'hand-left-outline',
				label: 'Απόρρητο',
				path: '/profile/privacy'
			},
			{
				id: 'notifications',
				icon: 'notifications-outline',
				label: 'Ειδοποιήσεις',
				path: '/profile/account-settings/notifications'
			},
			{
				id: 'language',
				icon: 'globe-outline',
				label: 'Γλώσσα και θέμα',
				path: '/profile/account-settings/language'
			}
		]);
		for (const section of member) {
			expect(readProfileAddress(section.path.replace(/^\/profile\//u, '')), section.id).toEqual({
				view: 'settings',
				section: section.id
			});
		}
		// (negative) no row for a section that is only an id yet.
		const built = settingsSections.filter((section) => section.built).map((section) => section.id);
		expect(member.map((section) => section.id)).toEqual(built);
		// Card w45-w6: «Σύνδεση και ασφάλεια» is built, the second row (record §5.2); a guest's shell never has it.
		expect(member[1].id).toBe('security');
		expect(buildSettingsSections(el, { member: false }).map((section) => section.id)).not.toContain(
			'security'
		);
		// Card w45-w5, rule 8: «Προσωπικά στοιχεία» is built and FIRST; a guest's shell never has it.
		expect(member[0].id).toBe('personal');
		expect(buildSettingsSections(el, { member: false }).map((section) => section.id)).not.toContain(
			'personal'
		);
	});

	it('🔴 D-W45-05: a guest reads «Γλώσσα και θέμα» alone — the one section that needs no account, whatever else is built later', () => {
		expect(buildSettingsSections(el, { member: false }).map((section) => section.id)).toEqual([
			'language'
		]);
		const forGuest = settingsSections.filter((section) => !section.member);
		expect(forGuest.map((section) => section.id)).toEqual(['language']);
		// Every other section is a signed-in person's.
		for (const section of settingsSections.filter((entry) => entry.id !== 'language')) {
			expect(section.member, section.id).toBe(true);
		}
	});

	it('the rows are in the page’s language', () => {
		expect(buildSettingsSections(en, { member: true }).map((section) => section.label)).toEqual([
			'Personal details',
			'Sign-in and security',
			'Privacy',
			'Notifications',
			'Language and theme'
		]);
	});

	it('🔴 D-W45-29 (screen 62): «Απόρρητο» is no row of a guest’s shell, yet it is the ONE section a guest reads as a page of its own; every other section is not', () => {
		expect(buildSettingsSections(el, { member: false }).map((section) => section.id)).not.toContain(
			'privacy'
		);
		expect(buildGuestPage('privacy', el)).toEqual({
			id: 'privacy',
			icon: 'hand-left-outline',
			label: 'Απόρρητο',
			path: '/profile/privacy'
		});
		expect(buildGuestPage('privacy', en)?.label).toBe('Privacy');
		for (const section of ['personal', 'security', 'notifications', 'language', null] as const) {
			expect(buildGuestPage(section, el), String(section)).toBeNull();
		}
		expect(settingsSections.filter((section) => section.guestPage).map((s) => s.id)).toEqual([
			'privacy'
		]);
	});

	it('D-W45-01 (screen 62): a page a section opens is read from the closed list — anything else is none', () => {
		expect(settingsPageOf('tools')).toMatchObject({
			id: 'tools',
			section: 'privacy',
			member: false
		});
		expect(settingsPageOf('deletion-code')).toMatchObject({ back: 'deletion', member: true });
		expect(settingsPageOf(null)).toBeNull();
		expect(settingsPageOf(undefined)).toBeNull();
		expect(settingsPageOf('__proto__' as never)).toBeNull();
	});
});

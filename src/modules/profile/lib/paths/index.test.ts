import { describe, expect, it, vi } from 'vitest';
import { settingsPages, settingsSections } from '$modules/profile/config/settings';
import {
	accountSettingsPath,
	newRelativePath,
	profilePath,
	readProfileAddress,
	relativePath,
	relativesPath,
	settingsPagePath,
	settingsSectionPath
} from '.';

const ID = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';

describe('modules/profile/lib/paths · screen 55’s addresses (D-W4-20)', () => {
	it('the application’s words, each read back by the route’s closed list', () => {
		expect(profilePath).toBe('/profile');
		expect(relativesPath).toBe('/profile/relatives');
		expect(newRelativePath).toBe('/profile/relatives/new');
		expect(relativePath(ID)).toBe(`/profile/relatives/${ID}`);
		const rest = (path: string) => path.replace(/^\/profile\/?/u, '');
		expect(readProfileAddress(rest(relativesPath))).toEqual({ view: 'relatives' });
		expect(readProfileAddress(rest(newRelativePath))).toEqual({ view: 'relative-new' });
		expect(readProfileAddress(rest(relativePath(ID)))).toEqual({
			view: 'relative-edit',
			relativeId: ID
		});
	});

	it('🔴 U-65.6 (negative): an id is encoded, never a path of its own', () => {
		expect(relativePath('../admin')).toBe('/profile/relatives/..%2Fadmin');
		expect(relativePath('a?b#c')).toBe('/profile/relatives/a%3Fb%23c');
	});
});

describe('modules/profile/lib/paths · wave 4.5, screen 57’s addresses (D-W45-01)', () => {
	const rest = (path: string) => path.replace(/^\/profile\/?/u, '');

	it('D-W45-01: the shell and «Γλώσσα και θέμα», the application’s words, each read back by the route’s closed list', () => {
		expect(accountSettingsPath).toBe('/profile/account-settings');
		expect(settingsSectionPath('language')).toBe('/profile/account-settings/language');
		expect(readProfileAddress(rest(accountSettingsPath))).toEqual({ view: 'settings' });
		expect(readProfileAddress(rest(settingsSectionPath('language')))).toEqual({
			view: 'settings',
			section: 'language'
		});
	});

	it('D-W45-01: every section’s address is the decision’s — «Απόρρητο» at `/profile/privacy`, the others under the shell', () => {
		expect(settingsSectionPath('personal')).toBe('/profile/account-settings/personal');
		expect(settingsSectionPath('security')).toBe('/profile/account-settings/security');
		expect(settingsSectionPath('notifications')).toBe('/profile/account-settings/notifications');
		expect(settingsSectionPath('privacy')).toBe('/profile/privacy');
	});

	it('D-W45-01 (card w45-w3, screen 60): «Ειδοποιήσεις» at `/profile/account-settings/notifications`, read back by the route’s closed list', () => {
		expect(readProfileAddress('account-settings/notifications')).toEqual({
			view: 'settings',
			section: 'notifications'
		});
		expect(readProfileAddress(rest(settingsSectionPath('notifications')))).toEqual({
			view: 'settings',
			section: 'notifications'
		});
		// 🔴 U-65.6 (negative): nothing under it, beside it or in another case is an address.
		for (const path of [
			'account-settings/notifications/',
			'account-settings/notifications/APPOINTMENT_UPDATES',
			'account-settings/notifications/../language',
			'account-settings/Notifications',
			'account-settings/notification',
			'notifications',
			'account-settings/notifications<script>',
			`account-settings/notifications/${'a'.repeat(4096)}`
		]) {
			expect(readProfileAddress(path), path).toBeUndefined();
		}
	});

	// Rewrites the list of card w45-w1 (it named «notifications» among the sections not built): card w45-w3 built screen
	// 60. The decision D-W45-02 did not change.
	// Rewrites the list of the unbuilt (card w45-w1: «personal, security, privacy, notifications»; w45-w3 took
	// «notifications» out): card w45-w4 built «privacy» (screen 62). The decision stands — only the «today» moved.
	// … and card w45-w5 built «personal» (screen 58): «security» alone is left.
	// … and card w45-w6 built «security» (screen 59): none is left today, so the rule is also kept by the planted
	// register of the test after this one (a section that is only an id again).
	it('🔴 D-W45-02: μόνο οι χτισμένες ενότητες έχουν διεύθυνση — a section whose screen is not built yet is no address (a 404), whatever the register says of its route', () => {
		const unbuilt = settingsSections.filter((section) => !section.built);
		expect(unbuilt.map((section) => section.id)).toEqual([]);
		for (const section of unbuilt) {
			expect(readProfileAddress(section.route), section.id).toBeUndefined();
		}
		for (const section of settingsSections.filter((entry) => entry.built)) {
			expect(readProfileAddress(section.route), section.id).toEqual({
				view: 'settings',
				section: section.id
			});
		}
	});

	it('🔴 D-W45-02 (negative, planted · card w45-w6): the address reads the register’s `built` — the same route with its section marked not built is no address again, and the others stay', async () => {
		vi.resetModules();
		vi.doMock('$modules/profile/config/settings', async (original) => {
			const real = await original<typeof import('$modules/profile/config/settings')>();
			return {
				...real,
				settingsSections: real.settingsSections.map((section) =>
					section.id === 'security' ? { ...section, built: false } : section
				)
			};
		});
		try {
			const planted = await import('.');
			expect(planted.readProfileAddress('account-settings/security')).toBeUndefined();
			expect(planted.readProfileAddress('account-settings/personal')).toEqual({
				view: 'settings',
				section: 'personal'
			});
			expect(planted.readProfileAddress('account-settings')).toEqual({ view: 'settings' });
		} finally {
			vi.doUnmock('$modules/profile/config/settings');
			vi.resetModules();
		}
	});

	it('D-W45-01 (card w45-w6, screen 59): «Σύνδεση και ασφάλεια» at `/profile/account-settings/security`, read back by the route’s closed list', () => {
		expect(readProfileAddress('account-settings/security')).toEqual({
			view: 'settings',
			section: 'security'
		});
		expect(readProfileAddress(rest(settingsSectionPath('security')))).toEqual({
			view: 'settings',
			section: 'security'
		});
		// 🔴 U-65.6 (negative): nothing under it, beside it or in another case is an address — no session's id, no
		// provider, no step of the password ever makes one.
		for (const path of [
			'account-settings/security/',
			'account-settings/security/password',
			'account-settings/security/sessions',
			'account-settings/security/0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b',
			'account-settings/security/GOOGLE',
			'account-settings/security/../language',
			'account-settings/Security',
			'account-settings/securit',
			'security',
			'account-settings/security<script>',
			`account-settings/security/${'a'.repeat(4096)}`
		]) {
			expect(readProfileAddress(path), path).toBeUndefined();
		}
	});

	it('🔴 U-65.6 (negative): anything out of the list is no address — an unknown section, the old `/theme`, a level more, a trailing slash, another case, a path out, markup, a very long word', () => {
		for (const path of [
			'account-settings/theme',
			'account-settings/unknown',
			'account-settings/language/el',
			'account-settings/language/',
			'account-settings/',
			'account-settings/Language',
			'Account-Settings',
			'account-settings/../relatives',
			'account-settings/<script>',
			`account-settings/${'a'.repeat(4096)}`,
			'accountsettings',
			'account-setting',
			'settings',
			'language'
		]) {
			expect(readProfileAddress(path), path).toBeUndefined();
		}
	});

	it('D-W45-01 (card w45-w4, screen 62): «Απόρρητο» and the three pages it opens, at the application’s addresses — each read back by the route’s closed list, with its section', () => {
		expect(settingsSectionPath('privacy')).toBe('/profile/privacy');
		expect(readProfileAddress('privacy')).toEqual({ view: 'settings', section: 'privacy' });
		expect(settingsPagePath('tools')).toBe('/profile/third-party-tools');
		expect(settingsPagePath('deletion')).toBe('/profile/account-settings/deletion');
		expect(settingsPagePath('deletion-code')).toBe('/profile/account-settings/deletion/code');
		for (const page of settingsPages) {
			expect(readProfileAddress(page.route), page.id).toEqual({
				view: 'settings',
				section: 'privacy',
				page: page.id
			});
			expect(settingsPagePath(page.id)).toBe(`/profile/${page.route}`);
		}
		expect(settingsPages.map((page) => page.id)).toEqual(['tools', 'deletion', 'deletion-code']);
	});

	it('D-W45-30: the deletion’s two pages need a session, the tools’ does not (D-W45-29); the code step’s «←» is step 1, the others’ their section', () => {
		expect(settingsPages.map((page) => [page.id, page.member, page.back, page.section])).toEqual([
			['tools', false, null, 'privacy'],
			['deletion', true, null, 'privacy'],
			['deletion-code', true, 'deletion', 'privacy']
		]);
	});

	it('🔴 U-65.6 (card w45-w4, negative): ο κωδικός δεν μπαίνει ποτέ σε διεύθυνση — no address carries a code or a word after a page’s own; a look-alike is none', () => {
		for (const path of [
			'account-settings/deletion/code/123456',
			'account-settings/deletion/code/000000/',
			'account-settings/deletion/code?code=123456',
			'account-settings/deletion/123456',
			'account-settings/deletion/',
			'account-settings/deletion/code/',
			'account-settings/Deletion',
			'third-party-tools/x',
			'third-party-tools/',
			'third-party',
			'privacy/',
			'privacy/tools',
			'privacy/deletion',
			'Privacy',
			'deletion',
			'deletion/code',
			`third-party-tools/${'a'.repeat(4096)}`,
			'privacy/<script>'
		]) {
			expect(readProfileAddress(path), path).toBeUndefined();
		}
		// No function that makes an address of the flow takes anything of the person or the code.
		expect(settingsPagePath.length).toBe(1);
		for (const page of settingsPages) expect(settingsPagePath(page.id)).not.toMatch(/[?#=]|\d{6}/u);
	});

	it('the addresses of wave 4.0 read as they did', () => {
		expect(readProfileAddress('')).toEqual({ view: 'tab' });
		expect(readProfileAddress(undefined)).toEqual({ view: 'tab' });
		expect(readProfileAddress('relatives')).toEqual({ view: 'relatives' });
		expect(readProfileAddress('relatives/new')).toEqual({ view: 'relative-new' });
		expect(readProfileAddress(`relatives/${ID}`)).toEqual({
			view: 'relative-edit',
			relativeId: ID
		});
		expect(readProfileAddress('relatives/account-settings')).toBeUndefined();
	});
});

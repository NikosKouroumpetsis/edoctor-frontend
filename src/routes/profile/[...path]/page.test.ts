import { describe, expect, it } from 'vitest';
import { load } from './+page';

const ID = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';

const run = (path: string) => load({ params: { path } } as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/profile/[...path] load (D-W4-20, D-W4-51)', () => {
	it('D-W4-51: `/profile` is still the «Προφίλ» tab (U-81.1)', () => {
		expect(run('')).toEqual({ address: { view: 'tab' } });
	});

	it('D-W4-20: «Οι συγγενείς μου», «Νέος συγγενής» and one relative’s form, the application’s words', () => {
		expect(run('relatives')).toEqual({ address: { view: 'relatives' } });
		expect(run('relatives/new')).toEqual({ address: { view: 'relative-new' } });
		expect(run(`relatives/${ID}`)).toEqual({
			address: { view: 'relative-edit', relativeId: ID }
		});
	});

	it('D-W4-20 / U-65.6 (negative): anything out of the list is a 404 — another word, no id, one level too deep, a path out, a trailing slash, a very long value', () => {
		for (const path of [
			'/',
			'settings',
			'relative',
			'Relatives',
			'relatives/',
			'relatives/edit',
			'relatives/NEW',
			'relatives/1',
			`relatives/${ID}x`,
			`relatives/${ID}/edit`,
			'relatives/new/x',
			'relatives/../relatives',
			'../admin',
			`relatives/<script>`,
			`relatives/${'a'.repeat(4096)}`
		]) {
			expect(
				thrown(() => run(path)),
				path
			).toMatchObject({ status: 404 });
		}
	});

	it('review w4-w1 R1 NIT-4: the router hands the load a DECODED rest (SvelteKit `decodeURIComponent`) — an encoded slash opens the same closed form, never free text', () => {
		expect(run(decodeURIComponent(`relatives%2F${ID}`))).toEqual(run(`relatives/${ID}`));
		expect(thrown(() => run(decodeURIComponent(`relatives%2F${ID}%2Fedit`)))).toMatchObject({
			status: 404
		});
	});

	it('D-W45-01 (wave 4.5): «Ρυθμίσεις λογαριασμού» and «Γλώσσα και θέμα» under the same route, the application’s words', () => {
		expect(run('account-settings')).toEqual({ address: { view: 'settings' } });
		expect(run('account-settings/language')).toEqual({
			address: { view: 'settings', section: 'language' }
		});
	});

	it('D-W45-01 (card w45-w3): «Ειδοποιήσεις» (screen 60) under the same route, the application’s word', () => {
		expect(run('account-settings/notifications')).toEqual({
			address: { view: 'settings', section: 'notifications' }
		});
	});

	it('D-W45-01 (card w45-w6): «Σύνδεση και ασφάλεια» (screen 59) under the same route, the application’s word', () => {
		expect(run('account-settings/security')).toEqual({
			address: { view: 'settings', section: 'security' }
		});
	});

	it('D-W45-01 (card w45-w4, screen 62): «Απόρρητο», «Εργαλεία τρίτων και cookies» and the two steps of «Διαγραφή λογαριασμού» under the same route, the application’s words — each page with the section it belongs to', () => {
		expect(run('privacy')).toEqual({ address: { view: 'settings', section: 'privacy' } });
		expect(run('third-party-tools')).toEqual({
			address: { view: 'settings', section: 'privacy', page: 'tools' }
		});
		expect(run('account-settings/deletion')).toEqual({
			address: { view: 'settings', section: 'privacy', page: 'deletion' }
		});
		expect(run('account-settings/deletion/code')).toEqual({
			address: { view: 'settings', section: 'privacy', page: 'deletion-code' }
		});
	});

	it('🔴 U-65.6 (card w45-w4, negative): ο κωδικός δεν μπαίνει ποτέ σε διεύθυνση — nothing after the code step’s address is an address: a code, a word, a trailing slash', () => {
		for (const path of [
			'account-settings/deletion/code/123456',
			'account-settings/deletion/code/',
			'account-settings/deletion/123456',
			'account-settings/deletion/',
			'account-settings/deletion/done',
			'third-party-tools/analytics',
			'third-party-tools/',
			'privacy/tools',
			'privacy/',
			'Privacy',
			'deletion',
			'account-settings/privacy',
			'account-settings/third-party-tools'
		]) {
			expect(
				thrown(() => run(path)),
				path
			).toMatchObject({ status: 404 });
		}
	});

	// Rewrites the list of card w45-w1 (it named «account-settings/notifications», then not built): card w45-w3 built it;
	// card w45-w4 built «privacy» and «account-settings/deletion» (screen 62), so they left this list too.
	// Rewrites the same list by card w45-w5: «account-settings/personal» (screen 58) is built, so it left the list; a
	// level under it stays a 404.
	// … and by card w45-w6: «account-settings/security» (screen 59) is built, so it left the list too; a level under it
	// (a step, a session's id) stays a 404.
	it('D-W45-01 / D-W45-02 / U-65.6 (negative): a section not built yet, the old `/theme`, an unknown one, a level more or a trailing slash is a 404', () => {
		for (const path of [
			'account-settings/theme',
			'account-settings/personal/',
			'account-settings/personal/email',
			'account-settings/security/',
			'account-settings/security/password',
			'account-settings/security/0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b',
			'account-settings/notifications/',
			'account-settings/notifications/REMINDERS',
			'account-settings/unknown',
			'account-settings/language/el',
			'account-settings/',
			'account-settings/<script>',
			`account-settings/${'a'.repeat(4096)}`
		]) {
			expect(
				thrown(() => run(path)),
				path
			).toMatchObject({ status: 404 });
		}
	});

	it('D-W45-01: the router hands the load a DECODED rest — an encoded slash opens the same section, never free text', () => {
		expect(run(decodeURIComponent('account-settings%2Flanguage'))).toEqual(
			run('account-settings/language')
		);
		expect(thrown(() => run(decodeURIComponent('account-settings%2Ftheme')))).toMatchObject({
			status: 404
		});
	});
});

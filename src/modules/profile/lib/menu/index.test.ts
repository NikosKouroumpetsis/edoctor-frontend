import { describe, expect, it } from 'vitest';
import { ioniconNames } from '$shared/ui/icons/ionicon';
import { buildProfileMenu } from '.';

describe('profile::lib::menu', () => {
	// Rewrites U-82.2 by D-W4-56: «Οι συγγενείς μου» has its web page since wave 4.0, so only two rows stay hidden.
	it('U-82.2: γραμμές χωρίς σελίδα web κρυμμένες — «Ραντεβού γιατρού», «Ταμείο»; a guest reads the application’s rows in its order', () => {
		const sections = buildProfileMenu({ locale: 'el' });
		expect(sections.map((section) => section.rows.map((row) => row.label))).toEqual([
			['Ρυθμίσεις λογαριασμού', 'Βρείτε βοήθεια', 'Απόρρητο'],
			['Νομικά']
		]);
		const words = sections.flatMap((section) => section.rows.map((row) => row.label)).join(' ');
		for (const hidden of ['Οι συγγενείς μου', 'Ραντεβού γιατρού', 'Ταμείο']) {
			expect(words).not.toContain(hidden);
		}
	});

	it('D-W4-56: a member reads «Οι συγγενείς μου» first in «account», as the application; still no «Ραντεβού γιατρού» or «Ταμείο»', () => {
		const sections = buildProfileMenu({ locale: 'el' }, { member: true });
		expect(sections.map((section) => section.rows.map((row) => row.label))).toEqual([
			['Οι συγγενείς μου', 'Ρυθμίσεις λογαριασμού', 'Βρείτε βοήθεια', 'Απόρρητο'],
			['Νομικά']
		]);
		expect(sections[0].rows[0]).toEqual({
			id: 'relatives',
			icon: 'people-outline',
			label: 'Οι συγγενείς μου'
		});
		const words = sections.flatMap((section) => section.rows.map((row) => row.label)).join(' ');
		for (const hidden of ['Ραντεβού γιατρού', 'Ταμείο']) expect(words).not.toContain(hidden);
		expect(
			buildProfileMenu({ locale: 'en' }, { member: true })[0].rows.map((row) => row.label)
		).toEqual(['My relatives', 'Account settings', 'Get help', 'Privacy']);
	});

	it('D-W4-56 (negative): a guest never reads the row, named or by default', () => {
		for (const sections of [
			buildProfileMenu({ locale: 'el' }, { member: false }),
			buildProfileMenu({ locale: 'el' })
		]) {
			expect(sections.flatMap((section) => section.rows.map((row) => row.id))).not.toContain(
				'relatives'
			);
		}
	});

	it('U-82.2: the same in English, and every glyph is one the kit carries', () => {
		const sections = buildProfileMenu({ locale: 'en' });
		expect(sections.flatMap((section) => section.rows.map((row) => row.label))).toEqual([
			'Account settings',
			'Get help',
			'Privacy',
			'Legal'
		]);
		for (const row of [
			...sections.flatMap((section) => section.rows),
			...buildProfileMenu({ locale: 'en' }, { member: true }).flatMap((section) => section.rows)
		]) {
			expect(ioniconNames).toContain(row.icon);
		}
	});
});

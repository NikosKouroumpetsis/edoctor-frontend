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

	// Rewrites «D-W4-56: a member reads «Οι συγγενείς μου» first in «account»» by card w45-w2 (record §5.1, U-164): the
	// row keeps its page and its rule (a session only) and moves under «Ρυθμίσεις λογαριασμού»; «Αποσύνδεση» is the last.
	it('🔴 U-164 (wave 4.5, screen 56): a member reads Ρυθμίσεις λογαριασμού · Οι συγγενείς μου · Βρείτε βοήθεια · Απόρρητο · — · Νομικά · Αποσύνδεση — «Αποσύνδεση» the LAST row (Ε3 Α); still no «Ραντεβού γιατρού» or «Ταμείο»', () => {
		const sections = buildProfileMenu({ locale: 'el' }, { member: true });
		expect(sections.map((section) => section.rows.map((row) => row.label))).toEqual([
			['Ρυθμίσεις λογαριασμού', 'Οι συγγενείς μου', 'Βρείτε βοήθεια', 'Απόρρητο'],
			['Νομικά', 'Αποσύνδεση']
		]);
		expect(sections[0].rows[1]).toEqual({
			id: 'relatives',
			icon: 'people-outline',
			label: 'Οι συγγενείς μου'
		});
		expect(sections.at(-1)?.rows.at(-1)).toEqual({
			id: 'sign-out',
			icon: 'log-out-outline',
			label: 'Αποσύνδεση'
		});
		const words = sections.flatMap((section) => section.rows.map((row) => row.label)).join(' ');
		for (const hidden of ['Ραντεβού γιατρού', 'Ταμείο']) expect(words).not.toContain(hidden);
		expect(
			buildProfileMenu({ locale: 'en' }, { member: true }).map((section) =>
				section.rows.map((row) => row.label)
			)
		).toEqual([
			['Account settings', 'My relatives', 'Get help', 'Privacy'],
			['Legal', 'Log out']
		]);
	});

	it('🔴 U-164.1 (negative): no row of a doctor’s, for a guest or a member — «Λειτουργία γιατρού» is the application’s alone', () => {
		for (const member of [false, true]) {
			for (const locale of ['el', 'en'] as const) {
				const rows = buildProfileMenu({ locale }, { member }).flatMap((section) => section.rows);
				expect(rows.map((row) => row.id).join(' ')).not.toMatch(/doctor|till/u);
				expect(rows.map((row) => row.label).join(' ')).not.toMatch(/γιατρ|doctor|Ταμείο|Till/iu);
			}
		}
	});

	it('D-W4-56 (negative): a guest never reads the row, named or by default — nor «Αποσύνδεση» (U-164 Ε3)', () => {
		for (const sections of [
			buildProfileMenu({ locale: 'el' }, { member: false }),
			buildProfileMenu({ locale: 'el' })
		]) {
			const ids = sections.flatMap((section) => section.rows.map((row) => row.id));
			expect(ids).not.toContain('relatives');
			expect(ids).not.toContain('sign-out');
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

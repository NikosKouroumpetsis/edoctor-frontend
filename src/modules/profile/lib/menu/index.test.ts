import { describe, expect, it } from 'vitest';
import { ioniconNames } from '$shared/ui/icons/ionicon';
import { buildProfileMenu } from '.';

describe('profile::lib::menu', () => {
	it('U-82.2: γραμμές χωρίς σελίδα web κρυμμένες — only the rows the web has, in the application’s order', () => {
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

	it('U-82.2: the same in English, and every glyph is one the kit carries', () => {
		const sections = buildProfileMenu({ locale: 'en' });
		expect(sections.flatMap((section) => section.rows.map((row) => row.label))).toEqual([
			'Account settings',
			'Get help',
			'Privacy',
			'Legal'
		]);
		for (const row of sections.flatMap((section) => section.rows)) {
			expect(ioniconNames).toContain(row.icon);
		}
	});
});

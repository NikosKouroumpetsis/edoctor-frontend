import { describe, expect, it } from 'vitest';
import type { ResolvedPathname } from '$app/types';
import {
	buildAccountEntries,
	buildBottomNavItems,
	hidesFooterOnPhone,
	isExploreFlow,
	showsBottomNav,
	showsSiteFooter
} from './frame';

const href = (path: string) => path as ResolvedPathname;
const el = { locale: 'el' } as const;

describe('the frame’s rules per page', () => {
	it('U-84 Π2: a conversation and «Προηγούμενες συνομιλίες» are pushed over the tabs; the list keeps them', () => {
		expect(showsBottomNav('/messages')).toBe(true);
		expect(showsBottomNav('/messages/018f3c1e')).toBe(false);
		expect(showsBottomNav('/messages/archive')).toBe(false);
		expect(showsBottomNav('/messages/018f3c1e', 404)).toBe(true);
	});

	it('U-84 Π1: the messages end without the footer at every width', () => {
		expect(showsSiteFooter('/messages')).toBe(false);
		expect(showsSiteFooter('/messages/018f3c1e')).toBe(false);
		expect(showsSiteFooter('/messages/archive')).toBe(false);
		expect(showsSiteFooter('/messages-other')).toBe(true);
	});

	it('🔴 U-84 Π5: the unread badge on «Μηνύματα» of the capsule, current on its pushed pages too', () => {
		const items = buildBottomNavItems(el, href, '/messages/018f3c1e', {
			badge: '9+',
			label: '12 μη αναγνωσμένες συνομιλίες'
		});
		const tab = items.find((item) => item.key === 'messages');
		expect(tab).toMatchObject({
			badge: '9+',
			badgeLabel: '12 μη αναγνωσμένες συνομιλίες',
			current: true
		});
		expect(items.filter((item) => item.badge)).toHaveLength(1);
		expect(
			buildBottomNavItems(el, href, '/').find((item) => item.key === 'messages')?.badge
		).toBeUndefined();
	});

	it('🔴 U-84 Π5: the dot on «Μηνύματα» of a member’s menu while something is unread, and only then', () => {
		const dot = (unread: boolean) =>
			buildAccountEntries(el, href, true, unread).find((entry) => entry.key === 'messages');
		expect(dot(true)).toMatchObject({ dotLabel: 'Νέα μηνύματα' });
		expect(dot(false)).not.toHaveProperty('dotLabel');
		expect(
			buildAccountEntries(el, href, false, true).some((entry) => entry.key === 'messages')
		).toBe(false);
	});

	it('Π1 (wave 1.5, screen 5): the phone’s capsule shows everywhere but on a doctor’s profile and its windows, which keep their own booking bar', () => {
		expect(showsBottomNav('/')).toBe(true);
		expect(showsBottomNav('/doctors')).toBe(true);
		expect(showsBottomNav('/articles/flu')).toBe(true);
		expect(showsBottomNav('/doctors/dr-athena')).toBe(false);
		// U-77: a doctor's articles are over the tabs, as the profile.
		expect(showsBottomNav('/doctors/dr-athena/articles')).toBe(false);
		expect(showsBottomNav('/doctors/dr-athena/about')).toBe(false);
		expect(showsBottomNav('/doctors/dr-athena/')).toBe(false);
		expect(showsBottomNav('/doctors/dr-athena/details/reviews')).toBe(false);
		expect(showsBottomNav('/doctors/dr-athena/other')).toBe(true);
	});

	it('U-61.2 Ε3: an error page shows the capsule on every path — a doctor’s «δεν βρέθηκε» too (no booking bar there)', () => {
		expect(showsBottomNav('/doctors/den-yparxei', 404)).toBe(true);
		expect(showsBottomNav('/doctors/dr-athena', 503)).toBe(true);
		expect(showsBottomNav('/doctors/dr-athena', 200)).toBe(false);
	});

	it('MINOR-4 (r1, U-25.2): a profile is no page of the search, and keeps the footer', () => {
		expect(isExploreFlow('/doctors/dr-athena')).toBe(false);
		expect(showsSiteFooter('/doctors/dr-athena')).toBe(true);
		expect(showsSiteFooter('/doctors')).toBe(false);
	});

	it('U-81.1, Ε2: `/login` is the application’s sheet below 744 (no capsule under it); `/login` and `/profile` end without the footer there, with it from 744', () => {
		expect(showsBottomNav('/login')).toBe(false);
		expect(showsBottomNav('/profile')).toBe(true);
		expect(hidesFooterOnPhone('/login')).toBe(true);
		expect(hidesFooterOnPhone('/profile/')).toBe(true);
		expect(hidesFooterOnPhone('/favorites')).toBe(true);
		expect(hidesFooterOnPhone('/doctors/dr-athena/about')).toBe(true);
		expect(hidesFooterOnPhone('/doctors/dr-athena')).toBe(false);
		expect(hidesFooterOnPhone('/help')).toBe(false);
		expect(showsSiteFooter('/profile')).toBe(true);
	});

	it('U-81.2 / U-82.3: κάψουλα 4 καρτελών, κανένα φύλλο-μενού — every tab a page, the same for everyone, the current one marked', () => {
		const items = buildBottomNavItems(el, href, '/profile');
		expect(items.map((item) => [item.label, item.href])).toEqual([
			['Εξερευνήστε', '/'],
			['Αγαπημένα', '/favorites'],
			['Μηνύματα', '/messages'],
			['Προφίλ', '/profile']
		]);
		for (const item of items) expect(item.onclick).toBeUndefined();
		expect(items.filter((item) => item.current).map((item) => item.key)).toEqual(['profile']);
		expect(buildBottomNavItems(el, href, '/favorites').find((item) => item.current)?.key).toBe(
			'favorites'
		);
		expect(buildBottomNavItems(el, href, '/messages/').find((item) => item.current)?.key).toBe(
			'messages'
		);
		expect(buildBottomNavItems(el, href, '/').find((item) => item.current)?.key).toBe('explore');
		expect(buildBottomNavItems(el, href, '/help').some((item) => item.current)).toBe(false);
	});

	it('U-80.1 Ε3: μενού χωρίς Λογαριασμό — a member’s rows, in their order', () => {
		const entries = buildAccountEntries(el, href, true);
		expect(entries.map((entry) => entry.label)).toEqual([
			'Μηνύματα',
			'Αγαπημένα',
			'Ρυθμίσεις',
			'Κέντρο βοήθειας',
			'Είστε γιατρός;',
			'Αποσύνδεση'
		]);
		expect(entries.map((entry) => entry.label).join(' ')).not.toMatch(/Λογαριασμ|Account/u);
		expect(buildAccountEntries({ locale: 'en' }, href, true).map((e) => e.label)).not.toContain(
			'Account'
		);
		expect(entries.filter((entry) => entry.separated).map((entry) => entry.key)).toEqual([
			'settings',
			'doctor',
			'sign-out'
		]);
	});

	it('a guest’s menu stays the four of U-17.2, with no way out', () => {
		expect(buildAccountEntries(el, href).map((entry) => entry.key)).toEqual([
			'sign-in',
			'settings',
			'help',
			'doctor'
		]);
	});
});

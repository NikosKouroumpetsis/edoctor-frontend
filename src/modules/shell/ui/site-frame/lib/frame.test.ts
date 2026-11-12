import { describe, expect, it } from 'vitest';
import type { ResolvedPathname } from '$app/types';
import {
	buildAccountEntries,
	buildBottomNavItems,
	buildFooterColumns,
	doctorOnboardingPath,
	frameHeaderOf,
	hidesFooterOnPhone,
	isExploreFlow,
	showsBottomNav,
	showsSiteFooter
} from './frame';

const href = (path: string) => path as ResolvedPathname;
const el = { locale: 'el' } as const;

describe('the frame’s rules per page', () => {
	it('🔴 U-81.2 / P-W3 §3.1 (wave 3): the booking (30, 31, every «Αλλαγή») and the doctor’s sign-up are pushed over the tabs and end without the footer', () => {
		for (const path of [
			'/doctors/dr-athena/booking',
			'/doctors/dr-athena/booking/',
			'/doctors/dr-athena/booking/time',
			'/doctors/dr-athena/booking/details/phone',
			'/doctors/dr-athena/booking/success',
			'/doctor/onboarding',
			'/doctor/onboarding/',
			'/doctor/onboarding/stage/1',
			'/doctor/onboarding/location/pin'
		]) {
			expect(showsBottomNav(path), path).toBe(false);
			expect(showsSiteFooter(path), path).toBe(false);
		}
		// An error page keeps the capsule on them too (U-61.2 Ε3).
		expect(showsBottomNav('/doctor/onboarding/stage/9', 404)).toBe(true);
	});

	it('🔴 U-61.1 (review w3-w1 MINOR-1): an error page under the booking or the sign-up is inside the whole frame — the bar and the footer', () => {
		for (const path of [
			'/doctor/onboarding/stage/9',
			'/doctors/unknown/booking',
			'/doctors/x/booking/time'
		]) {
			for (const status of [404, 503]) {
				expect(frameHeaderOf(path, status), `${path} ${status}`).toBe('site');
				expect(showsSiteFooter(path, status), `${path} ${status}`).toBe(true);
			}
			expect(frameHeaderOf(path, 200)).not.toBe('site');
			expect(showsSiteFooter(path, 200)).toBe(false);
		}
		// The results keep their own end at an error too (unchanged).
		expect(showsSiteFooter('/doctors', 404)).toBe(false);
	});

	it('P-W3 §3.1 / record §3.4: the bar from 744 — the whole one on the site, the mark alone on the booking, none on the sign-up (it draws its own)', () => {
		expect(frameHeaderOf('/')).toBe('site');
		expect(frameHeaderOf('/doctors/dr-athena')).toBe('site');
		expect(frameHeaderOf('/doctors/dr-athena/details/location')).toBe('site');
		expect(frameHeaderOf('/doctors/dr-athena/booking')).toBe('brand');
		expect(frameHeaderOf('/doctors/dr-athena/booking/for-whom')).toBe('brand');
		expect(frameHeaderOf('/doctor/onboarding')).toBe('none');
		expect(frameHeaderOf('/doctor/onboarding/office')).toBe('none');
	});

	it('P-W3 §3.1 (negative): look-alike paths keep the site’s frame — no slug, another word, the plural', () => {
		for (const path of [
			'/doctors/booking',
			'/doctors/dr-athena/bookings',
			'/doctor/onboardings',
			'/doctors/onboarding',
			'/doctor',
			'/plans'
		]) {
			expect(frameHeaderOf(path), path).toBe('site');
			expect(showsSiteFooter(path), path).toBe(true);
		}
		expect(showsBottomNav('/doctors/booking')).toBe(false);
		expect(showsBottomNav('/doctor/onboardings')).toBe(true);
	});

	it('record §6.4 «Είσοδος» (wave 3): «Είστε γιατρός;» and «Γίνετε μέλος του eDoctor» open the doctor’s sign-up; «Πλάνα συνδρομής» keeps the plans (P-W3 Σ-11)', () => {
		expect(doctorOnboardingPath).toBe('/doctor/onboarding');
		for (const isMember of [false, true]) {
			expect(
				buildAccountEntries(el, href, isMember).find((entry) => entry.key === 'doctor')
			).toMatchObject({ href: '/doctor/onboarding' });
		}
		const doctors = buildFooterColumns(el, href, 'support@edoctor.test')[1].links;
		expect(doctors.map((link) => link.href)).toEqual(['/doctor/onboarding', '/plans', '/clinics']);
	});

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

	// Rewrites «U-81.2 / U-82.3: κάψουλα 4 καρτελών»: U-134.6 (wave 4.0) adds «Ραντεβού», third (the application's order).
	it('U-81.2 / U-134.6: κάψουλα 5 καρτελών, κανένα φύλλο-μενού — every tab a page, the same for everyone, the current one marked', () => {
		const items = buildBottomNavItems(el, href, '/profile');
		expect(items.map((item) => [item.label, item.href])).toEqual([
			['Εξερευνήστε', '/'],
			['Αγαπημένα', '/favorites'],
			['Ραντεβού', '/appointments'],
			['Μηνύματα', '/messages'],
			['Προφίλ', '/profile']
		]);
		expect(items.find((item) => item.key === 'appointments')).toMatchObject({
			icon: 'calendar-outline',
			activeIcon: 'calendar'
		});
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

	// U-134.6 + P-W4 Σ-13 (wave 4.0) add «Τα ραντεβού μου» (bold, after «Μηνύματα») and «Οι συγγενείς μου» (above
	// «Ρυθμίσεις», the rule moving up with it).
	it('U-80.1 Ε3 · U-134.6: μενού χωρίς Λογαριασμό — a member’s rows, in their order, «Τα ραντεβού μου» and «Οι συγγενείς μου» among them', () => {
		const entries = buildAccountEntries(el, href, true);
		expect(entries.map((entry) => entry.label)).toEqual([
			'Μηνύματα',
			'Τα ραντεβού μου',
			'Αγαπημένα',
			'Οι συγγενείς μου',
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
			'relatives',
			'doctor',
			'sign-out'
		]);
		const bold = entries.filter((entry) => entry.kind === 'link' && entry.emphasis);
		expect(bold.map((entry) => entry.key)).toEqual(['messages', 'appointments', 'favorites']);
		expect(entries.find((entry) => entry.key === 'appointments')).toMatchObject({
			href: '/appointments'
		});
		expect(entries.find((entry) => entry.key === 'relatives')).toMatchObject({
			href: '/profile/relatives'
		});
		expect(
			buildAccountEntries({ locale: 'en' }, href, true)
				.filter((entry) => ['appointments', 'relatives'].includes(entry.key))
				.map((entry) => entry.label)
		).toEqual(['My appointments', 'My relatives']);
	});

	it('a guest’s menu stays the four of U-17.2, with no way out — (negative) neither «Τα ραντεβού μου» nor «Οι συγγενείς μου»', () => {
		const entries = buildAccountEntries(el, href);
		expect(entries.map((entry) => entry.key)).toEqual(['sign-in', 'settings', 'help', 'doctor']);
		expect(entries.filter((entry) => entry.separated).map((entry) => entry.key)).toEqual([
			'settings',
			'doctor'
		]);
	});

	it('🔴 U-81.2 / P-W4 §3.3 (wave 4.0): an appointment, every screen it opens, the rating and a relative’s form are pushed over the tabs; «Τα ραντεβού μου» and «Οι συγγενείς μου» keep them (P-W4 Σ-25)', () => {
		const id = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';
		for (const path of ['/appointments', '/appointments/', '/profile/relatives', '/profile']) {
			expect(showsBottomNav(path), path).toBe(true);
		}
		for (const path of [
			`/appointments/${id}`,
			`/appointments/${id}/time`,
			`/appointments/${id}/for-whom`,
			`/appointments/${id}/relative`,
			`/appointments/${id}/note`,
			`/appointments/${id}/cancel`,
			`/ratings/${id}`,
			'/profile/relatives/new',
			`/profile/relatives/${id}`
		]) {
			expect(showsBottomNav(path), path).toBe(false);
			// U-61.2 Ε3: an error page keeps the capsule.
			expect(showsBottomNav(path, 404), path).toBe(true);
		}
	});

	it('🔴 D-W4-55 (wave 4.0): no footer on the appointments, the rating or the relatives, at any width; 🔴 U-61.1: an error page under them has it', () => {
		const id = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';
		for (const path of [
			'/appointments',
			`/appointments/${id}`,
			`/appointments/${id}/cancel`,
			`/ratings/${id}`,
			'/profile/relatives',
			'/profile/relatives/new',
			`/profile/relatives/${id}`
		]) {
			expect(showsSiteFooter(path), path).toBe(false);
			expect(showsSiteFooter(path, 404), path).toBe(true);
			expect(frameHeaderOf(path), path).toBe('site');
		}
		// The profile's own page keeps it (from 744, U-81.1 Ε2).
		expect(showsSiteFooter('/profile')).toBe(true);
		expect(hidesFooterOnPhone('/profile')).toBe(true);
	});

	it('U-134.6: «Ραντεβού» is current on the patient’s appointment pages, «Προφίλ» on «Οι συγγενείς μου» (the prototype’s `rel.js:159`)', () => {
		const current = (path: string) =>
			buildBottomNavItems(el, href, path)
				.filter((item) => item.current)
				.map((item) => item.key);
		expect(current('/appointments')).toEqual(['appointments']);
		expect(current('/appointments/')).toEqual(['appointments']);
		expect(current('/ratings/0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b')).toEqual(['appointments']);
		expect(current('/profile/relatives')).toEqual(['profile']);
		expect(current('/profile')).toEqual(['profile']);
	});

	it('wave 4.0 (negative): look-alike paths keep the site’s own frame — another word, the plural, a prefix, the bare `/ratings`', () => {
		for (const path of [
			'/appointment',
			'/appointmentsx',
			'/ratings',
			'/rating/x',
			'/relatives',
			'/profile/relative',
			'/profile/relativesx'
		]) {
			expect(showsBottomNav(path), path).toBe(true);
			expect(showsSiteFooter(path), path).toBe(true);
			expect(
				buildBottomNavItems(el, href, path).some(
					(item) => item.key === 'appointments' && item.current
				),
				path
			).toBe(false);
		}
		expect(
			buildBottomNavItems(el, href, '/profile/relativesx').some(
				(item) => item.key === 'profile' && item.current
			)
		).toBe(false);
	});
});

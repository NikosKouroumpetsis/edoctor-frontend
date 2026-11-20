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

	it('🔴 D-W51-72 (wave 5.1): the cancel link’s page — the mark alone at every width, no footer, no capsule; nothing else is such a page', () => {
		for (const path of ['/a/AbCdEfGh_-123456', '/a/x']) {
			expect(frameHeaderOf(path), path).toBe('logo');
			expect(showsSiteFooter(path), path).toBe(false);
			expect(showsBottomNav(path), path).toBe(false);
		}
		for (const path of ['/a', '/a/x/y', '/about', '/appointments']) {
			expect(frameHeaderOf(path), path).not.toBe('logo');
		}
		// An error page there is the site's, inside the whole frame (U-61.1).
		expect(frameHeaderOf('/a/x', 404)).toBe('site');
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

	// Rewrites «P-W3 §3.1 (negative): … `/doctor` keeps the site's frame» by D-W51-16 (wave 5.1, screen 65): `/doctor` is
	// the doctor's «Σήμερα» now, a page of its own frame (below); the other look-alikes are as they were.
	it('P-W3 §3.1 (negative): look-alike paths keep the site’s frame — no slug, another word, the plural', () => {
		for (const path of [
			'/doctors/booking',
			'/doctors/dr-athena/bookings',
			'/doctor/onboardings',
			'/doctors/onboarding',
			'/doctor/menus',
			'/doctor/today',
			'/doctor/appointment',
			'/doctor/appointmentsx',
			'/doctor/patientsx',
			'/doctor/messagesx',
			'/doctor/notificationsx',
			'/doctor/notifications/x',
			// D-W52-22 / D-W52-26 (wave 5.2, screen 77): the two addresses alone — nothing under them yet.
			'/doctor/profiles',
			'/doctor/profilex',
			'/doctor/profile/x',
			'/doctor/profile/previews',
			'/doctor/profile/preview/x',
			// D-W52-41 (wave 5.2, screen 78): the photos' two addresses alone — never a look-alike, a slash more or less.
			'/doctor/profile/photosx',
			'/doctor/profile/photo',
			'/doctor/profile/photos/x',
			'/doctor/profile/photos/x/cropx',
			'/doctor/profile/photos/x/crop/y',
			'/doctor/profile/photos//crop',
			// Widened by D-W52-49 (wave 5.2, screen 79): `/doctor/profile/about` is the doctor's frame now (below); its
			// look-alikes and a section without its screen yet keep the site's.
			'/doctor/profile/abouts',
			'/doctor/profile/about/x',
			// Widened by D-W52-81 / 82 (wave 5.2, screen 83): `/doctor/profile/services` and the pages under it are the
			// doctor's frame now (below); their look-alikes keep the site's.
			'/doctor/profile/servicesx',
			'/doctor/profile/service',
			'/doctor/profile/services/x/y',
			'/doctor/profile/services/new/x/y',
			// Widened by D-W52-59 (wave 5.2, screen 80): `/doctor/profile/specialty` and the choice under it are the
			// doctor's frame now (below); their look-alikes keep the site's.
			'/doctor/profile/specialtyx',
			'/doctor/profile/specialty/x',
			'/doctor/profile/specialty/specializations/x',
			'/doctor/profile/specializations',
			// Widened by D-W52-63 (wave 5.2, screen 81): `/doctor/profile/cv` and one row under it are the doctor's
			// frame now (below); their look-alikes keep the site's.
			'/doctor/profile/cvx',
			'/doctor/profile/cv/x',
			'/doctor/profile/cv/new',
			'/doctor/profile/cv/studies',
			'/doctor/profile/cv/work/new',
			'/doctor/profile/cv/experience/new/x',
			'/doctor/profile/credentials',
			// Widened by D-W52-69 / 70 (wave 5.2, screen 82): `/doctor/profile/languages` and its two pages are the
			// doctor's frame now (below); their look-alikes keep the site's.
			'/doctor/profile/languagesx',
			'/doctor/profile/languages/x',
			'/doctor/profile/languages/spokenx',
			'/doctor/profile/languages/spoken/x',
			'/doctor/profile/languages/networks/facebook',
			'/doctor/profile/speak-languages',
			// Widened by D-W52-91 / 92 (wave 5.2, screen 84): `/doctor/reviews` and the two pages of a review are the
			// doctor's frame now (below); their look-alikes keep the site's.
			'/doctor/reviewsx',
			'/doctor/review',
			'/doctor/reviews/x',
			'/doctor/reviews/x/replyx',
			'/doctor/reviews/x/reply/y',
			'/doctor/reviews/x/delete',
			// Widened by D-W52-102 / 103 (wave 5.2, screen 85): `/doctor/articles` and one article are the doctor's frame
			// now (below); their look-alikes keep the site's.
			'/doctor/articlesx',
			'/doctor/article',
			'/doctor/articles/x/y',
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
	// Rewrites «U-80.1 Ε3 · U-134.6: μενού χωρίς Λογαριασμό» by D-W45-21 (wave 4.5, screen 56, U-164 Ε4 Α): a member's
	// «Ρυθμίσεις» is «Ρυθμίσεις λογαριασμού», the page of screen 57. U-80.1 Ε3 stands: no entry «Λογαριασμός» of its own.
	// Rewrites it again by D-W45-17 and card w45-w7 (screen 63, record §5.1): «Ειδοποιήσεις» is the first row under the
	// rule, which moves up to it from «Οι συγγενείς μου». Nothing else of the order changed.
	it('U-80.1 Ε3 · U-134.6 · 🔴 D-W45-21 · 🔴 D-W45-17: a member’s rows, in their order — Μηνύματα · Τα ραντεβού μου · Αγαπημένα · — · Ειδοποιήσεις · Οι συγγενείς μου · Ρυθμίσεις λογαριασμού · Κέντρο βοήθειας · — · Είστε γιατρός; · — · Αποσύνδεση; no entry «Λογαριασμός»', () => {
		const entries = buildAccountEntries(el, href, true);
		expect(entries.map((entry) => entry.label)).toEqual([
			'Μηνύματα',
			'Τα ραντεβού μου',
			'Αγαπημένα',
			'Ειδοποιήσεις',
			'Οι συγγενείς μου',
			'Ρυθμίσεις λογαριασμού',
			'Κέντρο βοήθειας',
			'Είστε γιατρός;',
			'Αποσύνδεση'
		]);
		expect(entries.map((entry) => entry.label)).not.toContain('Λογαριασμός');
		expect(buildAccountEntries({ locale: 'en' }, href, true).map((e) => e.label)).not.toContain(
			'Account'
		);
		expect(entries.filter((entry) => entry.separated).map((entry) => entry.key)).toEqual([
			'notifications',
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

	it('🔴 D-W45-21: a member’s «Ρυθμίσεις λογαριασμού» is a LINK to the page of screen 57, in the place «Ρυθμίσεις» had — after «Οι συγγενείς μου», under the same rule — and no window any more; the same in English', () => {
		const entries = buildAccountEntries(el, href, true);
		const keys = entries.map((entry) => entry.key);
		// (Card w45-w7: «Ειδοποιήσεις» now stands before «Οι συγγενείς μου»; this row's own place did not move.)
		expect(keys).toEqual([
			'messages',
			'appointments',
			'favorites',
			'notifications',
			'relatives',
			'account-settings',
			'help',
			'doctor',
			'sign-out'
		]);
		expect(entries.find((entry) => entry.key === 'account-settings')).toEqual({
			key: 'account-settings',
			kind: 'link',
			label: 'Ρυθμίσεις λογαριασμού',
			href: '/profile/account-settings'
		});
		expect(entries.some((entry) => entry.kind === 'settings')).toBe(false);
		expect(
			buildAccountEntries({ locale: 'en' }, href, true).find(
				(entry) => entry.key === 'account-settings'
			)
		).toMatchObject({ label: 'Account settings', href: '/profile/account-settings' });
	});

	// Rewrites «D-W45-17 (negative): no «Ειδοποιήσεις» in the menu yet — it comes with screen 63» by card w45-w7: screen
	// 63 is built, so the entry D-W45-17 held back is there — a member's alone. U-164.1 stands as it was.
	it('🔴 D-W45-17: «Ειδοποιήσεις» is in a MEMBER’s menu since screen 63 — a link to `/notifications`, not bold, the first row under the rule; (negative) never in a guest’s; 🔴 U-164.1: nothing of «Λειτουργία γιατρού» in either', () => {
		const entries = buildAccountEntries(el, href, true);
		expect(entries.find((entry) => entry.key === 'notifications')).toEqual({
			key: 'notifications',
			kind: 'link',
			label: 'Ειδοποιήσεις',
			href: '/notifications',
			separated: true
		});
		const keys = entries.map((entry) => entry.key);
		expect(keys.indexOf('notifications')).toBe(keys.indexOf('favorites') + 1);
		expect(keys.indexOf('relatives')).toBe(keys.indexOf('notifications') + 1);
		expect(entries.find((entry) => entry.key === 'relatives')).not.toHaveProperty('separated');
		expect(
			buildAccountEntries({ locale: 'en' }, href, true).find(
				(entry) => entry.key === 'notifications'
			)
		).toMatchObject({ label: 'Notifications', href: '/notifications' });
		for (const locale of ['el', 'en'] as const) {
			// A guest's menu, whatever the dots say.
			const guest = buildAccountEntries({ locale }, href, false, true, true)
				.map((entry) => entry.label)
				.join(' · ');
			expect(guest).not.toMatch(/Ειδοποιήσεις|Notifications/u);
			// Rewrites «U-164.1: nothing of «Λειτουργία γιατρού» in either» by U-185.1 (wave 5.1, screen 64): it holds for
			// whoever is not licensed for the marketplace — a guest, no registration, one under review, the till's alone.
			for (const isMember of [false, true]) {
				for (const doctor of ['none', 'pending', 'payments'] as const) {
					const labels = buildAccountEntries({ locale }, href, isMember, false, false, doctor)
						.map((entry) => entry.label)
						.join(' · ');
					expect(labels).not.toMatch(/Λειτουργία γιατρού|Doctor mode/u);
				}
			}
		}
	});

	it('🔴 D-W45-17: the dot on «Ειδοποιήσεις» while a notification is new, with the row’s name «Ειδοποιήσεις, νέες» — and only then; 🔴 U-84 Π5 stays: the messages’ dot is its own, each lights without the other', () => {
		const row = (unread: boolean, fresh: boolean, key: string, locale: 'el' | 'en' = 'el') =>
			buildAccountEntries({ locale }, href, true, unread, fresh).find((entry) => entry.key === key);
		expect(row(false, true, 'notifications')).toMatchObject({
			label: 'Ειδοποιήσεις',
			name: 'Ειδοποιήσεις, νέες',
			dotLabel: 'Ειδοποιήσεις, νέες'
		});
		expect(row(false, true, 'notifications', 'en')).toMatchObject({
			label: 'Notifications',
			name: 'Notifications, new'
		});
		expect(row(false, false, 'notifications')).not.toHaveProperty('dotLabel');
		expect(row(false, false, 'notifications')).not.toHaveProperty('name');
		// A new notification lights nothing on «Μηνύματα», and an unread conversation nothing on «Ειδοποιήσεις».
		expect(row(false, true, 'messages')).not.toHaveProperty('dotLabel');
		expect(row(true, false, 'notifications')).not.toHaveProperty('dotLabel');
		expect(row(true, false, 'messages')).toMatchObject({ dotLabel: 'Νέα μηνύματα' });
		expect(row(true, true, 'messages')).toMatchObject({ dotLabel: 'Νέα μηνύματα' });
		expect(row(true, true, 'notifications')).toMatchObject({ name: 'Ειδοποιήσεις, νέες' });
		// The fifth argument is the notifications' alone: the four-argument call of U-84 Π5 reads as before.
		expect(
			buildAccountEntries(el, href, true, true).find((entry) => entry.key === 'notifications')
		).not.toHaveProperty('dotLabel');
	});

	it('🔴 D-W45-05 · D-W45-21: a guest’s menu stays the four of U-17.2, with no way out — its «Ρυθμίσεις» still the small window — (negative) neither «Τα ραντεβού μου» nor «Οι συγγενείς μου» nor «Ρυθμίσεις λογαριασμού»', () => {
		const entries = buildAccountEntries(el, href);
		expect(entries.map((entry) => entry.key)).toEqual(['sign-in', 'settings', 'help', 'doctor']);
		expect(entries.find((entry) => entry.key === 'settings')).toEqual({
			key: 'settings',
			kind: 'settings',
			label: 'Ρυθμίσεις',
			separated: true
		});
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

	describe('🔴 D-W45-07 (wave 4.5): «Ρυθμίσεις λογαριασμού» and its sections', () => {
		const SETTINGS = [
			'/profile/account-settings',
			'/profile/account-settings/',
			'/profile/account-settings/language',
			'/profile/account-settings/personal',
			'/profile/account-settings/deletion',
			'/profile/account-settings/deletion/code',
			// Card w45-w4 (screen 62, D-W45-01): «Απόρρητο» and «Εργαλεία τρίτων και cookies», the shell's pages at the
			// application's addresses.
			'/profile/privacy',
			'/profile/privacy/',
			'/profile/third-party-tools'
		];

		it('D-W45-07: χωρίς υποσέλιδο σε κάθε πλάτος — no footer on the shell or under it; 🔴 U-61.1: an error page under them has it again, in the site’s whole frame', () => {
			for (const path of SETTINGS) {
				expect(showsSiteFooter(path), path).toBe(false);
				expect(showsSiteFooter(path, 404), path).toBe(true);
				expect(frameHeaderOf(path), path).toBe('site');
				expect(frameHeaderOf(path, 404), path).toBe('site');
			}
		});

		it('D-W45-07: χωρίς τις καρτέλες κάτω, και στη λίστα — the shell is pushed over the tabs whole (the prototype’s `body.pushed`); 🔴 U-61.2: an error page keeps the capsule', () => {
			for (const path of SETTINGS) {
				expect(showsBottomNav(path), path).toBe(false);
				expect(showsBottomNav(path, 404), path).toBe(true);
			}
			// The «Προφίλ» tab and «Οι συγγενείς μου» keep theirs, as before.
			expect(showsBottomNav('/profile')).toBe(true);
			expect(showsBottomNav('/profile/relatives')).toBe(true);
		});

		it('D-W45-07: η καρτέλα «Προφίλ» μένει η τρέχουσα — on the shell and on every section', () => {
			for (const path of SETTINGS) {
				expect(
					buildBottomNavItems(el, href, path)
						.filter((item) => item.current)
						.map((item) => item.key),
					path
				).toEqual(['profile']);
			}
		});

		it('D-W45-07 (negative): look-alike paths keep the site’s own frame — another word, a prefix, the shell’s word outside `/profile`', () => {
			for (const path of [
				'/profile/account-settingsx',
				'/profile/account-setting',
				'/account-settings',
				'/account-settings/language',
				'/profile/settings',
				'/en/profile/account-settings',
				'/profile/privacyx',
				'/profile/privacy/x',
				'/profile/third-party-tools/x',
				'/profile/third-party',
				'/privacy',
				'/third-party-tools'
			]) {
				expect(showsBottomNav(path), path).toBe(true);
				expect(showsSiteFooter(path), path).toBe(true);
				expect(
					buildBottomNavItems(el, href, path).some(
						(item) => item.key === 'profile' && item.current
					),
					path
				).toBe(false);
			}
			// The «Προφίλ» page itself is as it was: its footer from 744 (U-81.1 Ε2).
			expect(showsSiteFooter('/profile')).toBe(true);
			expect(hidesFooterOnPhone('/profile')).toBe(true);
			expect(hidesFooterOnPhone('/profile/account-settings')).toBe(false);
		});
	});
	describe('wave 4.5 · screen 63 «Ειδοποιήσεις», the list (D-W45-49, record §5.8)', () => {
		const LIST = ['/notifications', '/notifications/'];

		it('D-W45-49: `/notifications` is a pushed page of the «Προφίλ» — no capsule, no footer at any width, the site’s bar from 744, «Προφίλ» the current tab; 🔴 U-61.1 / U-61.2: an error page there is inside the whole frame', () => {
			for (const path of LIST) {
				expect(showsBottomNav(path), path).toBe(false);
				expect(showsSiteFooter(path), path).toBe(false);
				expect(frameHeaderOf(path), path).toBe('site');
				expect(showsBottomNav(path, 500), path).toBe(true);
				expect(showsSiteFooter(path, 500), path).toBe(true);
				expect(
					buildBottomNavItems(el, href, path)
						.filter((item) => item.current)
						.map((item) => item.key),
					path
				).toEqual(['profile']);
			}
		});

		it('D-W45-49 (negative): look-alike paths keep the site’s own frame — a path under it, a prefix, another word, the settings’ own section', () => {
			for (const path of [
				'/notifications/x',
				'/notifications/018f3c1e-0000-7000-8000-000000000001',
				'/notificationsx',
				'/notification',
				'/en/notifications',
				'/profile/notifications'
			]) {
				expect(showsBottomNav(path), path).toBe(true);
				expect(showsSiteFooter(path), path).toBe(true);
			}
			// The settings' section «Ειδοποιήσεις» (screen 60) is the shell's, as before.
			expect(showsBottomNav('/profile/account-settings/notifications')).toBe(false);
			expect(showsSiteFooter('/profile/account-settings/notifications')).toBe(false);
		});
	});

	describe('wave 5.1 · screens 64 / 65 — the doctor standing in the patient’s frame (U-185.1, U-183.5, D-W51-16)', () => {
		const member = (
			doctor: 'none' | 'pending' | 'doctor' | 'payments',
			locale: 'el' | 'en' = 'el'
		) => buildAccountEntries({ locale }, href, true, false, false, doctor);

		it('U-185.1: Λειτουργία γιατρού μόνο με εγγραφή + άδεια — a licence of the marketplace has the switch in its own group after «Αγαπημένα», only below 1128, and no «Είστε γιατρός;»', () => {
			const entries = member('doctor');
			expect(entries.map((entry) => entry.key)).toEqual([
				'messages',
				'appointments',
				'favorites',
				'doctor-mode',
				'notifications',
				'relatives',
				'account-settings',
				'help',
				'sign-out'
			]);
			expect(entries.find((entry) => entry.key === 'doctor-mode')).toEqual({
				key: 'doctor-mode',
				kind: 'switch',
				label: 'Λειτουργία γιατρού',
				href: '/doctor',
				separated: true,
				hideFrom: 'laptop'
			});
			expect(member('doctor', 'en').find((entry) => entry.key === 'doctor-mode')?.label).toBe(
				'Doctor mode'
			);
			// 🔴 U-164.1 (rewritten for a licence): the ONE word of a doctor's in the patient's menu is the switch.
			const words = entries.map((entry) => entry.label).join(' · ');
			expect(words).not.toMatch(/Είστε γιατρός|Ραντεβού γιατρού|Ταμείο|Λειτουργία ασθενή/u);
		});

		it('U-183.5: a completed registration without a licence reads «Η αίτησή σας ελέγχεται» in the place of «Είστε γιατρός;», to the application’s page; no switch', () => {
			const entries = member('pending');
			expect(entries.find((entry) => entry.key === 'doctor')).toEqual({
				key: 'doctor',
				kind: 'link',
				label: 'Η αίτησή σας ελέγχεται',
				description: 'Δείτε ή αλλάξτε τα στοιχεία της εγγραφής σας.',
				href: '/doctor/onboarding',
				separated: true
			});
			expect(entries.some((entry) => entry.key === 'doctor-mode')).toBe(false);
		});

		it('D-W51-16: καμία Λειτουργία γιατρού για μόνο-ταμείου στο web — and no «Είστε γιατρός;» either (a licence is no sign-up)', () => {
			const keys = member('payments').map((entry) => entry.key);
			expect(keys).not.toContain('doctor-mode');
			expect(keys).not.toContain('doctor');
		});

		it('(negative) a guest’s menu stays the four of U-17.2 whatever a standing says; no registration reads «Είστε γιατρός;» as before', () => {
			for (const doctor of ['doctor', 'pending', 'payments'] as const) {
				expect(
					buildAccountEntries(el, href, false, false, false, doctor).map((entry) => entry.key)
				).toEqual(['sign-in', 'settings', 'help', 'doctor']);
			}
			expect(member('none').find((entry) => entry.key === 'doctor')?.label).toBe('Είστε γιατρός;');
		});

		// Widened by D-W51-31 (step 3, screen 67): «Ραντεβού» and what is under it are pages of the same frame.
		// Widened by D-W51-73 (step 9, screen 73, live 15/11): «Οι ασθενείς μου» and what is under it too.
		// Widened by D-W51-85 (step 10, screen 74): the doctor's messages and what is under them too.
		// Widened by D-W51-89 (step 11, screen 75): the doctor's notifications too (else two bars, as `/doctor/patients` live).
		// Widened by D-W52-22 / D-W52-26 (wave 5.2, screen 77): «Το προφίλ μου» and «Δείτε πώς σας βλέπουν» too.
		it('D-W51-16 · D-W51-31 · D-W51-73 · D-W51-85 · D-W51-89 · 🔴 D-W52-22: `/doctor`, `/doctor/menu`, `/doctor/appointments…`, `/doctor/patients…`, `/doctor/messages…`, `/doctor/notifications`, `/doctor/profile` and `/doctor/profile/preview` are the doctor’s frame — no bar, capsule or footer of the patient’s; 🔴 U-61.1 / U-61.2: an error page there is inside the site’s whole frame', () => {
			for (const path of [
				'/doctor',
				'/doctor/',
				'/doctor/menu',
				'/doctor/appointments',
				'/doctor/appointments/',
				'/doctor/appointments/0193d000-0000-7000-8000-000000000001',
				'/doctor/patients',
				'/doctor/patients/account/0193d000-0000-7000-8000-000000000001',
				'/doctor/patients/record/0193d000-0000-7000-8000-000000000002/edit',
				'/doctor/messages',
				'/doctor/messages/0193d000-0000-7000-8000-000000000003',
				'/doctor/messages/archive',
				'/doctor/messages/new',
				'/doctor/notifications',
				'/doctor/notifications/',
				'/doctor/profile',
				'/doctor/profile/',
				'/doctor/profile/preview',
				'/doctor/profile/preview/',
				// Widened by D-W52-41 (wave 5.2, screen 78): «Φωτογραφίες» and one photo's «Προσαρμογή» too.
				'/doctor/profile/photos',
				'/doctor/profile/photos/',
				'/doctor/profile/photos/0193d000-0000-7000-8000-000000000004/crop',
				// Widened by D-W52-49 (wave 5.2, screen 79): «Όνομα και περιγραφή» too.
				'/doctor/profile/about',
				'/doctor/profile/about/',
				// Widened by D-W52-59 (wave 5.2, screen 80): «Ειδικότητα και εξειδικεύσεις» and the choice too.
				'/doctor/profile/specialty',
				'/doctor/profile/specialty/',
				'/doctor/profile/specialty/specializations',
				'/doctor/profile/specialty/specializations/',
				// Widened by D-W52-63 (wave 5.2, screen 81): «Βιογραφικό» and the page of one row too.
				'/doctor/profile/cv',
				'/doctor/profile/cv/',
				'/doctor/profile/cv/studies/new',
				'/doctor/profile/cv/experience/0193d000-0000-7000-8000-000000000005',
				'/doctor/profile/cv/conferences/new/',
				// Widened by D-W52-69 / 70 (wave 5.2, screen 82): «Γλώσσες και κοινωνικά δίκτυα» and its two pages too.
				'/doctor/profile/languages',
				'/doctor/profile/languages/',
				'/doctor/profile/languages/spoken',
				'/doctor/profile/languages/networks/',
				// Widened by D-W52-81 / 82 (wave 5.2, screen 83): «Υπηρεσίες και τιμές» and the pages under it too.
				'/doctor/profile/services',
				'/doctor/profile/services/',
				'/doctor/profile/services/0193d000-0000-7000-8000-000000000083',
				'/doctor/profile/services/new',
				'/doctor/profile/services/new/0193d000-0000-7000-8000-000000000083/',
				// Widened by D-W52-91 / 92 (wave 5.2, screen 84): «Κριτικές» and the reply to a review and its report too.
				'/doctor/reviews',
				'/doctor/reviews/',
				'/doctor/reviews/0193d000-0000-7000-8000-000000000084/reply',
				'/doctor/reviews/0193d000-0000-7000-8000-000000000084/report/',
				// Widened by D-W52-102 / 103 (wave 5.2, screen 85): «Τα άρθρα μου», «Νέο άρθρο» and one article too.
				'/doctor/articles',
				'/doctor/articles/',
				'/doctor/articles/new',
				'/doctor/articles/0193d000-0000-7000-8000-000000000085/'
			]) {
				expect(frameHeaderOf(path), path).toBe('none');
				expect(showsBottomNav(path), path).toBe(false);
				expect(showsSiteFooter(path), path).toBe(false);
				expect(frameHeaderOf(path, 404), path).toBe('site');
				expect(showsBottomNav(path, 404), path).toBe(true);
				expect(showsSiteFooter(path, 404), path).toBe(true);
			}
			// The sign-up keeps its own (none), the patient's pages theirs.
			expect(frameHeaderOf('/doctor/onboarding')).toBe('none');
			expect(showsBottomNav('/profile')).toBe(true);
			// D-W51-89: the patient's list (screen 63) stays the patient's frame's.
			expect(frameHeaderOf('/notifications')).toBe('site');
			expect(showsSiteFooter('/notifications')).toBe(false);
		});
	});
});

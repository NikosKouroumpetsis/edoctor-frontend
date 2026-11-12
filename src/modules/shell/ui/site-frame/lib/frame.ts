import { m } from '$paraglide/messages.js';
import { languages, type SupportedLocale } from '$shared/preferences/i18n/locales';
import type { LanguageOption } from '$shared/ui/molecules/language-switcher';
import type { BottomNavItem } from '$shared/ui/organisms/bottom-nav';
import type { FooterColumn, FooterLink } from '$shared/ui/organisms/site-footer';
import { legalPath } from '$modules/shell/lib/legal';
import type { AccountEntry, FrameHeader, FrameMessageOptions, LocalizedHref } from '../types';

/**
 * 🔴 Wave 3 (record §6.4 «Είσοδος», P-W3 §3.3.1): where «Είστε γιατρός;», «Για γιατρούς» and «Γίνετε μέλος του eDoctor» lead —
 * the doctor's sign-up (its overview), no longer the empty `/plans`; «Πλάνα συνδρομής» keeps `/plans` (P-W3 Σ-11).
 */
export const doctorOnboardingPath = '/doctor/onboarding';

/** Wave 4.0 · screens 50 and 55 (D-W4-20, D-W4-51): «Τα ραντεβού μου» and «Οι συγγενείς μου», the application's words. */
const appointmentsPath = '/appointments';
const relativesPath = '/profile/relatives';

/**
 * The account menu from 744 (U-81.3), Airbnb's. A guest's four (U-17.2, U-17.5, U-19.1): «Σύνδεση ή εγγραφή» (bold) ·
 * — · «Ρυθμίσεις» · «Κέντρο βοήθειας» · — · «Είστε γιατρός;» with its line. 🔴 U-80.1 Ε3: a member's has no «Λογαριασμός»;
 * 🔴 U-134.6 + P-W4 Σ-13 (wave 4.0): «Μηνύματα» · «Τα ραντεβού μου» · «Αγαπημένα» (bold) · — · «Οι συγγενείς μου» ·
 * «Ρυθμίσεις» · «Κέντρο βοήθειας» · — · «Είστε γιατρός;» · — · «Αποσύνδεση».
 */
export function buildAccountEntries(
	messageOptions: FrameMessageOptions,
	href: LocalizedHref,
	isMember = false,
	hasUnread = false
): AccountEntry[] {
	const shared: AccountEntry[] = [
		{
			key: 'settings',
			kind: 'settings',
			label: m.account_menu_settings({}, messageOptions),
			separated: !isMember
		},
		{ key: 'help', kind: 'link', label: m.nav_help({}, messageOptions), href: href('/help') },
		{
			key: 'doctor',
			kind: 'link',
			label: m.account_menu_doctor_title({}, messageOptions),
			description: m.account_menu_doctor_body({}, messageOptions),
			href: href(doctorOnboardingPath),
			separated: true
		}
	];
	if (!isMember) {
		return [
			{
				key: 'sign-in',
				kind: 'link',
				label: m.account_menu_sign_in({}, messageOptions),
				href: href('/login'),
				emphasis: true
			},
			...shared
		];
	}
	return [
		{
			key: 'messages',
			kind: 'link',
			label: m.account_menu_messages({}, messageOptions),
			href: href('/messages'),
			emphasis: true,
			...(hasUnread ? { dotLabel: m.account_menu_new_messages({}, messageOptions) } : {})
		},
		{
			key: 'appointments',
			kind: 'link',
			label: m.account_menu_appointments({}, messageOptions),
			href: href(appointmentsPath),
			emphasis: true
		},
		{
			key: 'favorites',
			kind: 'link',
			label: m.account_menu_favorites({}, messageOptions),
			href: href('/favorites'),
			emphasis: true
		},
		{
			key: 'relatives',
			kind: 'link',
			label: m.account_menu_relatives({}, messageOptions),
			href: href(relativesPath),
			separated: true
		},
		...shared,
		{
			key: 'sign-out',
			kind: 'sign-out',
			label: m.account_menu_sign_out({}, messageOptions),
			separated: true
		}
	];
}

const trimmed = (basePath: string) =>
	basePath.length > 1 ? basePath.replace(/\/+$/, '') : basePath;

/** The search's own pages: the home and its results (U-25.2, the approved prototype's `s4-375`). */
const exploreFlowPages = ['/', '/doctors'];

/** U-84: the messages' list, and what is pushed over it below 744 (a conversation, «Προηγούμενες συνομιλίες»). */
const MESSAGES_PAGES = /^\/messages(?:\/[^/]+)?$/u;

/**
 * Wave 4.0 · screens 50–54 (D-W4-51): «Τα ραντεβού μου», an appointment and every screen it opens (`/appointments/…`), and
 * the rating of a visit (`/ratings/<id>`), which shows beside the same list from 950 (P-W4 Σ-6).
 */
const APPOINTMENTS_PAGES = /^\/(?:appointments(?:\/.+)?|ratings\/.+)$/u;

/** Wave 4.0 · screen 55: «Οι συγγενείς μου» (`/profile/relatives`) and the form it opens (`/profile/relatives/…`). */
const RELATIVES_PAGES = /^\/profile\/relatives(?:\/.+)?$/u;

/**
 * 🔴 MINOR-4 (r1, U-25.2): whether `basePath` (the path without the language) belongs to the search, so the capsule
 * marks «Εξερευνήστε» there: the home and the results — never a profile or any other page (U-26.1's rule).
 */
export function isExploreFlow(basePath: string): boolean {
	return exploreFlowPages.includes(trimmed(basePath));
}

/**
 * 🔴 U-81.2 / U-134.6: below 744 the web is the application, navigation too — the capsule's five tabs in the
 * application's order (U-81.4), the same for a guest and a member, each its page: «Εξερευνήστε» the search (the home and
 * its results, U-25.2), «Αγαπημένα», «Ραντεβού» (wave 4.0), «Μηνύματα» and «Προφίλ» (U-81.1: a page as the
 * application's tab, no sheet of a menu; current on «Οι συγγενείς μου» too, the prototype's `rel.js:159`).
 */
export function buildBottomNavItems(
	messageOptions: FrameMessageOptions,
	href: LocalizedHref,
	basePath: string,
	/** 🔴 U-84 Π5: the unread badge of «Μηνύματα» (`9+` past nine), as the application's tab; none for a guest. */
	unread?: { badge: string; label: string } | null
): BottomNavItem[] {
	const path = trimmed(basePath);
	return [
		{
			key: 'explore',
			label: m.tab_explore({}, messageOptions),
			icon: 'search-outline',
			activeIcon: 'search',
			href: href('/'),
			current: isExploreFlow(basePath)
		},
		{
			key: 'favorites',
			label: m.tab_favorites({}, messageOptions),
			icon: 'heart-outline',
			activeIcon: 'heart',
			href: href('/favorites'),
			current: path === '/favorites'
		},
		{
			key: 'appointments',
			label: m.tab_appointments({}, messageOptions),
			icon: 'calendar-outline',
			activeIcon: 'calendar',
			href: href(appointmentsPath),
			current: APPOINTMENTS_PAGES.test(path)
		},
		{
			key: 'messages',
			label: m.tab_messages({}, messageOptions),
			icon: 'chatbubble-outline',
			activeIcon: 'chatbubble',
			href: href('/messages'),
			current: MESSAGES_PAGES.test(path),
			...(unread ? { badge: unread.badge, badgeLabel: unread.label } : {})
		},
		{
			key: 'profile',
			label: m.tab_profile({}, messageOptions),
			icon: 'person-outline',
			activeIcon: 'person',
			href: href('/profile'),
			current: path === '/profile' || RELATIVES_PAGES.test(path)
		}
	];
}

/**
 * Airbnb's three columns (U-16.9): «Υποστήριξη», «Για γιατρούς», «eDoctor». Every entry goes somewhere (U-20): the
 * pages of wave 1.5 open their placeholder at their final address (help, articles), «Επικοινωνία» writes to the
 * support mailbox, «Γίνετε μέλος» opens the doctor's sign-up and «Πλάνα συνδρομής» the plans.
 */
export function buildFooterColumns(
	messageOptions: FrameMessageOptions,
	href: LocalizedHref,
	supportEmail: string
): FooterColumn[] {
	return [
		{
			title: m.footer_support_title({}, messageOptions),
			links: [
				{ label: m.footer_help({}, messageOptions), href: href('/help') },
				{ label: m.footer_how_to_book({}, messageOptions), href: `${href('/help')}#booking` },
				{
					label: m.footer_cancel_appointment({}, messageOptions),
					href: `${href('/help')}#cancellation`
				},
				{ label: m.footer_contact({}, messageOptions), href: `mailto:${supportEmail}` },
				{ label: m.footer_account_deletion({}, messageOptions), href: href('/account-deletion') }
			]
		},
		{
			title: m.footer_doctors_title({}, messageOptions),
			links: [
				{ label: m.footer_join({}, messageOptions), href: href(doctorOnboardingPath) },
				{ label: m.footer_plans({}, messageOptions), href: href('/plans') },
				{ label: m.nav_clinics({}, messageOptions), href: href('/clinics') }
			]
		},
		{
			title: m.footer_company_title({}, messageOptions),
			links: [
				{ label: m.nav_doctors({}, messageOptions), href: href('/doctors') },
				{ label: m.nav_articles({}, messageOptions), href: href('/articles') }
			]
		}
	];
}

/** «Απόρρητο · Όροι · Cookies» after the rights line: the legal pages at the application's slugs (`legal/[slug]`). */
export function buildLegalLinks(
	messageOptions: FrameMessageOptions,
	href: LocalizedHref
): FooterLink[] {
	return [
		{ label: m.footer_privacy({}, messageOptions), href: href(legalPath('privacy-policy')) },
		{ label: m.footer_terms_short({}, messageOptions), href: href(legalPath('terms-of-use')) },
		{ label: m.footer_cookies({}, messageOptions), href: href(legalPath('cookies-policy')) }
	];
}

/** The pages that end without the footer: the results (§7.2 of the wave record, Airbnb's map page). */
const pagesWithoutFooter = ['/doctors'];

/** Wave 3 · screens 30, 31 and their «Αλλαγή» screens (U-102): `/doctors/<slug>/booking` and what is under it. */
const BOOKING_PAGES = /^\/doctors\/[^/]+\/booking(?:\/.+)?$/u;

/** Wave 3 · screens 33–42: the doctor's sign-up, its overview and every step (`/doctor/onboarding/…`). */
const ONBOARDING_PAGES = /^\/doctor\/onboarding(?:\/.+)?$/u;

/**
 * 🔴 U-81.2 / P-W3 §3.1: the frame's top bar on `basePath` (the path without the language) — `site` the whole bar
 * (from 744, U-16.3), `brand` only the mark over a thin line (the booking from 744, record §3.4: nothing leads away
 * from it), `none` no bar of the frame (the sign-up draws its own: the mark, «Βοήθεια», «Αποθήκευση και έξοδος»).
 * 🔴 U-61.1 (review w3-w1 MINOR-1): an error page (`status` ≥ 400) under either is the site's, inside the whole frame.
 */
export function frameHeaderOf(basePath: string, status = 200): FrameHeader {
	if (status >= 400) return 'site';
	const path = trimmed(basePath);
	if (ONBOARDING_PAGES.test(path)) return 'none';
	if (BOOKING_PAGES.test(path)) return 'brand';
	return 'site';
}

/** The pages that end without the footer at every width; an error page under them has it again (U-61.1). */
const FOOTERLESS_PAGES = [BOOKING_PAGES, ONBOARDING_PAGES, APPOINTMENTS_PAGES, RELATIVES_PAGES];

/**
 * Whether the frame draws its footer on `basePath` (the path without the language): every page but the results,
 * which end their list with the thin legal line instead («© 2026 eDoctor · Απόρρητο · Όροι · Cookies · 🌐»).
 */
export function showsSiteFooter(basePath: string, status = 200): boolean {
	const path = trimmed(basePath);
	// U-61.1: an error page under the booking, the sign-up or the patient's pages keeps the footer (the site's frame,
	// MINOR-1 of w3-w1).
	if (status >= 400 && FOOTERLESS_PAGES.some((pages) => pages.test(path))) return true;
	// U-84 Π1: the messages end without it at every width (Airbnb). Wave 3: neither the booking nor the sign-up has it
	// (their bar is pinned to the bottom, the application's below 744 and Airbnb's from it). 🔴 D-W4-55 (wave 4.0): nor
	// the appointments, the rating or the relatives — from 950 their two columns fill the screen, as the messages'.
	return (
		!pagesWithoutFooter.includes(path) &&
		!MESSAGES_PAGES.test(path) &&
		!FOOTERLESS_PAGES.some((pages) => pages.test(path))
	);
}

/**
 * 🔴 Π1 (wave 1.5, screen 5): whether the phone's capsule shows on `basePath` (the path without the language) — every
 * page but a doctor's profile and its windows (`/doctors/<slug>`, `/doctors/<slug>/details/<section>`), a page over
 * the tabs with its own booking bar at the bottom, as in the application and on Airbnb's 402. 🔴 U-61.2 Ε3: an error
 * page (`status` ≥ 400) shows it everywhere, a doctor's «δεν βρέθηκε» too (no booking bar there).
 */
export function showsBottomNav(basePath: string, status = 200): boolean {
	if (status >= 400) return true;
	const path = trimmed(basePath);
	if (path === '/login') return false;
	// U-84 Π2: a conversation and «Προηγούμενες συνομιλίες» are pushed over the tabs, as in the application.
	if (/^\/messages\/[^/]+$/u.test(path)) return false;
	// 🔴 U-81.2 (wave 3): the booking and the sign-up are pushed over the tabs, as in the application: their own bar.
	if (BOOKING_PAGES.test(path) || ONBOARDING_PAGES.test(path)) return false;
	// 🔴 U-81.2 (wave 4.0, P-W4 §3.3): an appointment and what it opens, the rating and a relative's form are pushed over
	// the tabs (the prototype's `body.pushed`); «Τα ραντεβού μου» and «Οι συγγενείς μου» keep them (P-W4 Σ-25).
	if (APPOINTMENTS_PAGES.test(path) && path !== appointmentsPath) return false;
	if (RELATIVES_PAGES.test(path) && path !== relativesPath) return false;
	// U-77, U-73.1: a doctor's articles and page are over the tabs too, as the profile (the application has none there).
	return !/^\/doctors\/[^/]+(?:\/details\/[^/]+|\/articles|\/about)?$/u.test(path);
}

/** The pages that are the application's own below 744 (U-81.1, Ε2): no footer there, the site's footer from 744. */
const pagesWithoutPhoneFooter = ['/login', '/profile', '/favorites'];

/**
 * Whether the footer waits for 744 on `basePath`: the tabs of `/profile` and `/favorites`, the sheet of `/login` and,
 * U-73.1 Π2, of a doctor's page.
 */
export function hidesFooterOnPhone(basePath: string): boolean {
	const path = trimmed(basePath);
	return pagesWithoutPhoneFooter.includes(path) || /^\/doctors\/[^/]+\/about$/u.test(path);
}

/** One option per language, each pointing at the same page in that language. */
export function buildLanguageOptions(
	current: SupportedLocale,
	samePageIn: (locale: SupportedLocale) => string
): LanguageOption[] {
	return languages.map((language) => ({
		locale: language.locale,
		href: samePageIn(language.locale),
		label: language.label,
		shortLabel: language.shortLabel,
		current: language.locale === current
	}));
}

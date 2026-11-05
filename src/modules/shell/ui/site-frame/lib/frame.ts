import { m } from '$paraglide/messages.js';
import { languages, type SupportedLocale } from '$shared/preferences/i18n/locales';
import type { LanguageOption } from '$shared/ui/molecules/language-switcher';
import type { BottomNavItem } from '$shared/ui/organisms/bottom-nav';
import type { FooterColumn, FooterLink } from '$shared/ui/organisms/site-footer';
import { legalPath } from '$modules/shell/lib/legal';
import type { AccountEntry, FrameMessageOptions, LocalizedHref } from '../types';

/**
 * The account menu from 744 (U-81.3), Airbnb's. A guest's four (U-17.2, U-17.5, U-19.1): «Σύνδεση ή εγγραφή» (bold) ·
 * — · «Ρυθμίσεις» · «Κέντρο βοήθειας» · — · «Είστε γιατρός;» with its line. 🔴 U-80.1 Ε3: a member's has no «Λογαριασμός»:
 * «Μηνύματα» · «Αγαπημένα» (bold) · — · «Ρυθμίσεις» · «Κέντρο βοήθειας» · — · «Είστε γιατρός;» · — · «Αποσύνδεση».
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
			separated: true
		},
		{ key: 'help', kind: 'link', label: m.nav_help({}, messageOptions), href: href('/help') },
		{
			key: 'doctor',
			kind: 'link',
			label: m.account_menu_doctor_title({}, messageOptions),
			description: m.account_menu_doctor_body({}, messageOptions),
			href: href('/plans'),
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
			key: 'favorites',
			kind: 'link',
			label: m.account_menu_favorites({}, messageOptions),
			href: href('/favorites'),
			emphasis: true
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
 * 🔴 MINOR-4 (r1, U-25.2): whether `basePath` (the path without the language) belongs to the search, so the capsule
 * marks «Εξερευνήστε» there: the home and the results — never a profile or any other page (U-26.1's rule).
 */
export function isExploreFlow(basePath: string): boolean {
	return exploreFlowPages.includes(trimmed(basePath));
}

/**
 * 🔴 U-81.2 / U-82.3: below 744 the web is the application, navigation too — the capsule's four tabs, the same for a
 * guest and a member, each its page: «Εξερευνήστε» the search (the home and its results, U-25.2), «Αγαπημένα», «Μηνύματα»
 * and «Προφίλ» (U-81.1: a page as the application's tab, no sheet of a menu).
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
			current: path === '/profile'
		}
	];
}

/**
 * Airbnb's three columns (U-16.9): «Υποστήριξη», «Για γιατρούς», «eDoctor». Every entry goes somewhere (U-20): the
 * pages of wave 1.5 open their placeholder at their final address (help, articles), «Επικοινωνία» writes to the
 * support mailbox, the doctor-facing entries open the plans.
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
				{ label: m.footer_join({}, messageOptions), href: href('/plans') },
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

/**
 * Whether the frame draws its footer on `basePath` (the path without the language): every page but the results,
 * which end their list with the thin legal line instead («© 2026 eDoctor · Απόρρητο · Όροι · Cookies · 🌐»).
 */
export function showsSiteFooter(basePath: string): boolean {
	const path = trimmed(basePath);
	// U-84 Π1: the messages end without it at every width (Airbnb).
	return !pagesWithoutFooter.includes(path) && !MESSAGES_PAGES.test(path);
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

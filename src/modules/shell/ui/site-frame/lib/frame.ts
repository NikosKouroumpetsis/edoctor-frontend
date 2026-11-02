import { m } from '$paraglide/messages.js';
import { languages, type SupportedLocale } from '$shared/preferences/i18n/locales';
import type { LanguageOption } from '$shared/ui/molecules/language-switcher';
import type { BottomNavItem } from '$shared/ui/organisms/bottom-nav';
import type { FooterColumn, FooterLink } from '$shared/ui/organisms/site-footer';
import { legalPath } from '$modules/shell/lib/legal';
import type { AccountEntry, FrameMessageOptions, LocalizedHref } from '../types';

/**
 * The guest's account menu (U-17.2, U-17.5, U-19.1), the same four everywhere: «Σύνδεση ή εγγραφή» (bold) · —
 * · «Ρυθμίσεις» · «Κέντρο βοήθειας» · — · «Είστε γιατρός;» with its line. The ☰ menu and the «Προφίλ» sheet draw it.
 */
export function buildAccountEntries(
	messageOptions: FrameMessageOptions,
	href: LocalizedHref
): AccountEntry[] {
	return [
		{
			key: 'sign-in',
			kind: 'link',
			label: m.account_menu_sign_in({}, messageOptions),
			href: href('/login'),
			emphasis: true
		},
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
}

/** The search's own pages: the home and its results (U-25.2, the approved prototype's `s4-375`). */
const exploreFlowPages = ['/', '/doctors'];

/**
 * 🔴 MINOR-4 (r1, U-25.2): whether `basePath` (the path without the language) belongs to the search, so the capsule
 * marks «Εξερευνήστε» there: the home and the results — never a profile or any other page (U-26.1's rule).
 */
export function isExploreFlow(basePath: string): boolean {
	const path = basePath.length > 1 ? basePath.replace(/\/+$/, '') : basePath;
	return exploreFlowPages.includes(path);
}

/**
 * The phone's capsule (U-16.6, U-26.1: the web keeps three): «Εξερευνήστε» is the search (the home and its results,
 * U-25.2); «Αγαπημένα» asks a guest to sign in first; «Προφίλ» opens the guest's account menu from below (U-19.1:
 * the settings, for a guest too) — the web has no session yet (U-20: every tab goes somewhere).
 */
export function buildBottomNavItems(
	messageOptions: FrameMessageOptions,
	href: LocalizedHref,
	isExplore: boolean,
	onProfile: () => void
): BottomNavItem[] {
	return [
		{
			key: 'explore',
			label: m.tab_explore({}, messageOptions),
			icon: 'search-outline',
			activeIcon: 'search',
			href: href('/'),
			current: isExplore
		},
		{
			key: 'favorites',
			label: m.tab_favorites({}, messageOptions),
			icon: 'heart-outline',
			activeIcon: 'heart',
			href: href('/login')
		},
		{
			key: 'profile',
			label: m.tab_profile({}, messageOptions),
			icon: 'person-outline',
			activeIcon: 'person',
			onclick: onProfile
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
	const path = basePath.length > 1 ? basePath.replace(/\/+$/, '') : basePath;
	return !pagesWithoutFooter.includes(path);
}

/**
 * 🔴 Π1 (wave 1.5, screen 5): whether the phone's capsule shows on `basePath` (the path without the language) — every
 * page but a doctor's profile and its windows (`/doctors/<slug>`, `/doctors/<slug>/details/<section>`), a page over
 * the tabs with its own booking bar at the bottom, as in the application and on Airbnb's 402. 🔴 U-61.2 Ε3: an error
 * page (`status` ≥ 400) shows it everywhere, a doctor's «δεν βρέθηκε» too (no booking bar there).
 */
export function showsBottomNav(basePath: string, status = 200): boolean {
	if (status >= 400) return true;
	const path = basePath.length > 1 ? basePath.replace(/\/+$/, '') : basePath;
	return !/^\/doctors\/[^/]+(?:\/details\/[^/]+)?$/u.test(path);
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

import { m } from '$paraglide/messages.js';
import { languages, type SupportedLocale } from '$shared/preferences/i18n';
import type { LanguageOption } from '$shared/ui/molecules/language-switcher';
import type { BottomNavItem } from '$shared/ui/organisms/bottom-nav';
import type { FooterColumn, FooterLink } from '$shared/ui/organisms/site-footer';
import type { FrameMessageOptions, LocalizedHref } from '../types';

/**
 * The five tabs of the application (`app/(tabs)/_layout.tsx`): search is the home page; the other four have
 * no web page yet and stay inert buttons until their screens are discussed (U-01.2).
 */
export function buildBottomNavItems(
	messageOptions: FrameMessageOptions,
	href: LocalizedHref,
	isHome: boolean
): BottomNavItem[] {
	return [
		{
			key: 'search',
			label: m.tab_search({}, messageOptions),
			icon: 'search-outline',
			activeIcon: 'search',
			href: href('/'),
			current: isHome
		},
		{
			key: 'favorites',
			label: m.tab_favorites({}, messageOptions),
			icon: 'heart-outline',
			activeIcon: 'heart'
		},
		{
			key: 'appointments',
			label: m.tab_appointments({}, messageOptions),
			icon: 'calendar-outline',
			activeIcon: 'calendar'
		},
		{
			key: 'messages',
			label: m.tab_messages({}, messageOptions),
			icon: 'chatbubble-outline',
			activeIcon: 'chatbubble'
		},
		{
			key: 'profile',
			label: m.tab_profile({}, messageOptions),
			icon: 'person-outline',
			activeIcon: 'person'
		}
	];
}

/** The footer's three columns; entries without a page yet are inert buttons, as before the kit. */
export function buildFooterColumns(
	messageOptions: FrameMessageOptions,
	href: LocalizedHref
): FooterColumn[] {
	return [
		{
			title: m.footer_support_title({}, messageOptions),
			links: [
				{ label: m.footer_help({}, messageOptions) },
				{ label: m.footer_contact({}, messageOptions) },
				{ label: m.footer_safety({}, messageOptions) }
			]
		},
		{
			title: m.footer_company_title({}, messageOptions),
			links: [
				{ label: m.nav_doctors({}, messageOptions), href: href('/doctors') },
				{ label: m.nav_clinics({}, messageOptions), href: href('/clinics') },
				{ label: m.nav_plans({}, messageOptions), href: href('/plans') }
			]
		},
		{
			title: m.footer_legal_title({}, messageOptions),
			links: [
				{ label: m.footer_terms({}, messageOptions) },
				{ label: m.footer_privacy({}, messageOptions) },
				{ label: m.footer_cookies({}, messageOptions) },
				{ label: m.footer_account_deletion({}, messageOptions), href: href('/account-deletion') }
			]
		}
	];
}

/** The legal entries of the footer's bottom row; they have no page yet and stay inert, as before the kit. */
export function buildLegalLinks(messageOptions: FrameMessageOptions): FooterLink[] {
	return [
		{ label: m.footer_terms({}, messageOptions) },
		{ label: m.footer_privacy({}, messageOptions) },
		{ label: m.footer_cookies({}, messageOptions) }
	];
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

import { useQueryClient } from '@tanstack/svelte-query';
import type { Pathname } from '$app/types';
import { invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { siteUrl } from '$shared/config/site';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { getSessionOptional } from '$shared/state/session';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	doctorDetailsPath,
	doctorProfilePath,
	type DoctorSelectedSlot,
	type DoctorSimilarArea,
	type DoctorSimilarSearch
} from '$modules/doctor/lib/detail';
import { bookingPath, hintsOf } from '$modules/appointments/lib/booking';
import { getBookingDraftOptional } from '$modules/appointments/ui/booking-draft';
import type { DoctorKeptBooking } from '$modules/doctor/ui/detail';
import { faqAnchors } from '$modules/help/config/faq';
import { conversationPath } from '$modules/messages/lib/paths';
import { resolveSimilarDoctorsArea } from '$modules/search-doctors/api/marketplace';
import { searchResultsHref } from '$modules/search-doctors/lib/search-criteria';
import { buildSimilarDoctorsCriteria } from '$modules/search-doctors/lib/similar-doctors';
import { useFavoriteToggle, useSignIn } from '$modules/search-doctors/ui/search-doctor-card';
import { legalPath } from '$modules/shell/lib/legal';

/**
 * The profile's screen (wave 1.5, screen 5): what the doctor's page needs from the rest of the site, composed here as
 * a module never imports another — the page's language, its addresses on the site's public origin (MINOR-5 of r1),
 * «Δείτε παρόμοιους γιατρούς» as the search module's results (U-37.2: the same specialty in the catalogue's area of
 * the active office, MAJOR-2 of r1) and the cards' sign-in (U-27.4). The details screen composes the same.
 */
export function useDoctorProfileScreen(slug: () => string) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string) => localizeHref(path, { locale });
	const queryClient = useQueryClient();
	const signIn = useSignIn(() => locale);
	// 🔴 U-85: the profile's hearts are the search's writer; the toast clears the booking bar below 744.
	const favorites = useFavoriteToggle(() => locale, { lift: 'page-bar' });
	const session = getSessionOptional();
	const booking = getBookingDraftOptional();

	return {
		get locale() {
			return locale;
		},
		localize,
		similarHref: (search: DoctorSimilarSearch, area: DoctorSimilarArea | null) => {
			const criteria = buildSimilarDoctorsCriteria({
				area,
				professionalId: search.professionalId,
				professionalName: search.professionalName,
				professionalSlug: search.professionalSlug
			});
			return resolve(searchResultsHref(localize('/doctors'), criteria) as `/doctors?${string}`);
		},
		similarAreaQuery: (city: string) => ({
			queryKey: ['doctor-similar-area', city, locale] as const,
			queryFn: () => resolveSimilarDoctorsArea(queryClient, city, { lang: locale }),
			staleTime: Infinity
		}),
		// 🔴 Wave 3 (P-W3 §3.2.1 δ): «Κράτηση» with a chosen hour — the booking's screen 30, its hints only (no person).
		bookingHref: (slot: DoctorSelectedSlot, serviceId: string | undefined) =>
			resolve(localize(bookingPath(slug(), null, hintsOf(slot, serviceId ?? null))) as Pathname),
		// Record §3.2 «η ώρα μένει»: the booking in progress for THIS doctor (its draft), so a «back» finds the hour.
		get kept(): DoctorKeptBooking | null {
			const slot = booking?.doctorSlug === slug() ? booking.slot : null;
			return slot ? { slot, serviceId: booking?.serviceId ?? null } : null;
		},
		get canonicalUrl() {
			return siteUrl(localize(doctorProfilePath(slug())));
		},
		get alternateUrls(): Record<SupportedLocale, string> {
			const path = doctorProfilePath(slug());
			return {
				el: siteUrl(localizeHref(path, { locale: 'el' })),
				en: siteUrl(localizeHref(path, { locale: 'en' }))
			};
		},
		get backHref() {
			return resolve(localize('/doctors') as Pathname);
		},
		href: (path: string) => resolve(localize(path) as Pathname),
		// 🔴 U-67.1, U-69.2: «Πώς λειτουργούν οι κριτικές» leads to the Help Centre's question and to the review policy.
		get reviewLinks() {
			return {
				helpHref: `${resolve(localize('/help') as Pathname)}#${faqAnchors.reviews}`,
				policyHref: resolve(localize(legalPath('review-policy')) as Pathname)
			};
		},
		// 🔴 U-75 Π3: «Τι πρέπει να γνωρίζετε» leads to the Help Centre's question and topic.
		get knowLinks() {
			const help = resolve(localize('/help') as Pathname);
			return {
				cancellationHref: `${help}#${faqAnchors.cancellation}`,
				bookingHref: `${help}#${faqAnchors.booking}`
			};
		},
		// 🔴 U-77: what the doctor's articles need from the rest of the site.
		articleHref: (articleSlug: string) =>
			resolve(localize(`/articles/${encodeURIComponent(articleSlug)}`) as Pathname),
		get doctorArticlesHref() {
			return resolve(localize(`${doctorProfilePath(slug())}/articles`) as Pathname);
		},
		// 🔴 U-84.6: where «Επικοινωνήστε» leads: a conversation, and «Κράτηση ραντεβού» of a doctor who accepts no messages.
		conversationHref: (conversationId: string) =>
			resolve(localize(conversationPath(conversationId)) as Pathname),
		get bookHref() {
			return resolve(localize(doctorDetailsPath(slug(), 'availability')) as Pathname);
		},
		get signedIn() {
			return session?.isMember ?? false;
		},
		onSignIn: signIn,
		favorites,
		onRetry: () => void invalidateAll()
	};
}

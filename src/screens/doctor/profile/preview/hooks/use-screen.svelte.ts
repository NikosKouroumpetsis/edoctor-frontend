import { useQueryClient } from '@tanstack/svelte-query';
import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { siteUrl } from '$shared/config/site';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import { bookingPath, hintsOf } from '$modules/appointments/lib/booking';
import {
	DoctorProfileNotFoundError,
	mapDoctorProfile,
	type DoctorProfile
} from '$modules/doctor/api/profile';
import {
	doctorProfilePath as publicProfilePath,
	type DoctorSelectedSlot,
	type DoctorSimilarArea,
	type DoctorSimilarSearch
} from '$modules/doctor/lib/detail';
import type { DoctorProfilePreviewAnswer } from '$modules/doctor-dashboard/api/profile';
import { doctorProfilePath } from '$modules/doctor-dashboard/lib/paths';
import { faqAnchors } from '$modules/help/config/faq';
import { resolveSimilarDoctorsArea } from '$modules/search-doctors/api/marketplace';
import { searchResultsHref } from '$modules/search-doctors/lib/search-criteria';
import { buildSimilarDoctorsCriteria } from '$modules/search-doctors/lib/similar-doctors';
import { legalPath } from '$modules/shell/lib/legal';

/**
 * Wave 5.2 · «Δείτε πώς σας βλέπουν» (D-W52-26, `/doctor/profile/preview`): what the public profile's page needs from the
 * rest of the site, composed here as a module never imports another (the profile's own screen composes the same,
 * `screens/doctors/[slug]`) — and the ONE thing the dashboard's read needs from the `doctor` module: the reader of the
 * public profile's answer (`read`). What a patient could send from the page is not composed: no «Επικοινωνήστε», no
 * writer behind the heart, no sign-in; «Κράτηση» with a chosen hour only leads to the booking's own page, as it does on
 * the public profile.
 */
export function useDoctorProfilePreviewScreen() {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string) => localizeHref(path, { locale });
	const href = (path: string) => resolve(localize(path) as Pathname);
	const queryClient = useQueryClient();

	return {
		get locale() {
			return locale;
		},
		localize,
		href,
		/**
		 * 🔴 D-W52-18: the public profile's own reader on the preview's answer — the SAME facts the public page draws. A
		 * `doctor: null` (no text, no specialty or no office yet) is `null`: the page shows what the public one shows then.
		 */
		read: (answer: DoctorProfilePreviewAnswer): DoctorProfile | null => {
			try {
				return mapDoctorProfile(answer, { slug: answer.doctor?.doctorId ?? '', lang: locale });
			} catch (error) {
				if (error instanceof DoctorProfileNotFoundError) return null;
				throw error;
			}
		},
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
		/** «Κράτηση» with a chosen hour: the booking's own page for the doctor's public address, nothing sent from here. */
		bookingHref: (slug: string, slot: DoctorSelectedSlot, serviceId: string | undefined) =>
			href(bookingPath(slug, null, hintsOf(slot, serviceId ?? null))),
		/** The public profile's address on the site's origin — what «Κοινοποίηση» of the page would share. */
		publicUrl: (slug: string) => siteUrl(localize(publicProfilePath(slug))),
		publicUrls: (slug: string): Record<SupportedLocale, string> => ({
			el: siteUrl(localizeHref(publicProfilePath(slug), { locale: 'el' })),
			en: siteUrl(localizeHref(publicProfilePath(slug), { locale: 'en' }))
		}),
		/** «Κλείσιμο» of the band, and where the page's own ways back lead: «Το προφίλ μου». */
		get closeHref() {
			return href(doctorProfilePath);
		},
		/** «Αναζήτηση γιατρών» of the «δεν βρέθηκε» page, as the public one's. */
		get searchHref() {
			return href('/doctors');
		},
		get reviewLinks() {
			return {
				helpHref: `${href('/help')}#${faqAnchors.reviews}`,
				policyHref: href(legalPath('review-policy'))
			};
		},
		get knowLinks() {
			const help = href('/help');
			return {
				cancellationHref: `${help}#${faqAnchors.cancellation}`,
				bookingHref: `${help}#${faqAnchors.booking}`
			};
		},
		articleHref: (articleSlug: string) => href(`/articles/${encodeURIComponent(articleSlug)}`),
		doctorArticlesHref: (slug: string) => href(`${publicProfilePath(slug)}/articles`)
	};
}

import { useQueryClient } from '@tanstack/svelte-query';
import type { Pathname } from '$app/types';
import { invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { siteUrl } from '$shared/config/site';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	doctorProfilePath,
	type DoctorSimilarArea,
	type DoctorSimilarSearch
} from '$modules/doctor/lib/detail';
import { resolveSimilarDoctorsArea } from '$modules/search-doctors/api/marketplace';
import { searchResultsHref } from '$modules/search-doctors/lib/search-criteria';
import { buildSimilarDoctorsCriteria } from '$modules/search-doctors/lib/similar-doctors';
import { useSignIn } from '$modules/search-doctors/ui/search-doctor-card';

/**
 * A window's own address (`/doctors/<slug>/details/<section>`, the application's `details/[section]`): the SAME
 * composition as the profile's screen (a screen never imports another; a test holds the two equal), so the page under
 * the window is the profile and its canonical address the profile's.
 */
export function useDoctorDetailsScreen(slug: () => string) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const localize = (path: string) => localizeHref(path, { locale });
	const queryClient = useQueryClient();
	const signIn = useSignIn(() => locale);

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
		onSignIn: signIn,
		onRetry: () => void invalidateAll()
	};
}

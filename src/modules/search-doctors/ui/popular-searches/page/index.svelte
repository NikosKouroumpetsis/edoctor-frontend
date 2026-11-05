<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { LinkDirectory, type LinkDirectoryTab } from '$shared/ui/molecules/link-directory';
	import { termFor } from '$modules/search-doctors/api/marketplace/sections';
	import {
		POPULAR_INITIAL_COUNT,
		popularAreaSearches,
		popularAreaTerms,
		popularSpecialtySearches,
		popularSpecialtyTerms,
		type PopularArea,
		type PopularSpecialty
	} from '$modules/search-doctors/config/popular-searches';
	import {
		defaultSearchDoctorsCriteria,
		searchResultsHref,
		textSelection
	} from '$modules/search-doctors/lib/search-criteria';

	const locale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale });
	const resultsPath = $derived(resolve(localizeHref('/doctors', { locale }) as Pathname));

	const areaLabels = $derived<Record<PopularArea, string>>({
		athens: m.area_athens({}, messageOptions),
		piraeus: m.area_piraeus({}, messageOptions),
		thessaloniki: m.area_thessaloniki({}, messageOptions),
		marousi: m.area_marousi({}, messageOptions),
		glyfada: m.area_glyfada({}, messageOptions),
		patra: m.area_patra({}, messageOptions),
		heraklion: m.area_heraklion({}, messageOptions),
		larisa: m.area_larisa({}, messageOptions)
	});
	const specialtyLabels = $derived<Record<PopularSpecialty, string>>({
		cardiology: m.popular_cardiologists({}, messageOptions),
		pediatrics: m.popular_pediatricians({}, messageOptions),
		dermatology: m.popular_dermatologists({}, messageOptions),
		psychology: m.popular_psychologists({}, messageOptions),
		gynecology: m.popular_gynecologists({}, messageOptions),
		orthopedics: m.popular_orthopedists({}, messageOptions),
		ophthalmology: m.popular_ophthalmologists({}, messageOptions),
		'internal-medicine': m.popular_internists({}, messageOptions),
		endocrinology: m.popular_endocrinologists({}, messageOptions),
		neurology: m.popular_neurologists({}, messageOptions),
		psychiatry: m.popular_psychiatrists({}, messageOptions),
		urology: m.popular_urologists({}, messageOptions),
		allergy: m.popular_allergists({}, messageOptions),
		'general-practice': m.popular_general_practitioners({}, messageOptions),
		nutrition: m.popular_nutritionists({}, messageOptions)
	});

	/** The results of these words (the application's URL names, `text` selections). */
	function hrefOf(what: string, where: string): string {
		return searchResultsHref(resultsPath, {
			...defaultSearchDoctorsCriteria,
			what,
			where,
			whatSelection: what ? textSelection(what) : null,
			whereSelection: where ? textSelection(where) : null
		});
	}

	const tabs = $derived<LinkDirectoryTab[]>([
		{
			id: 'specialties',
			label: m.footer_popular_specialties({}, messageOptions),
			links: popularSpecialtySearches.map(({ specialty, area }) => ({
				label: specialtyLabels[specialty],
				description: areaLabels[area],
				href: hrefOf(
					termFor(popularSpecialtyTerms[specialty], locale),
					termFor(popularAreaTerms[area], locale)
				)
			}))
		},
		{
			id: 'areas',
			label: m.footer_popular_areas({}, messageOptions),
			links: popularAreaSearches.map((area) => ({
				label: areaLabels[area],
				description: m.footer_popular_all_specialties({}, messageOptions),
				href: hrefOf('', termFor(popularAreaTerms[area], locale))
			}))
		}
	]);
</script>

<!-- The footer's popular searches (U-16.9): each link opens the results with the application's parameters. -->
<LinkDirectory
	title={m.footer_popular_title({}, messageOptions)}
	{tabs}
	initialCount={POPULAR_INITIAL_COUNT}
	moreLabel={m.footer_popular_more({}, messageOptions)}
	testId="footer-popular"
/>

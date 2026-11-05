import type {
	StreamedHomeSection,
	StreamedSectionResult
} from '$modules/search-doctors/api/home/load';
import type {
	SearchDoctorsSection,
	SearchDoctorsSectionLink
} from '$modules/search-doctors/api/marketplace/types';
import { buildDoctorCard } from '$modules/search-doctors/lib/doctor-card';
import {
	defaultSearchDoctorsCriteria,
	type SearchDoctorsCriteria
} from '$modules/search-doctors/lib/search-criteria';
import type { HomeRowResult, HomeSection, StreamedHomeRow } from '$modules/search-doctors/types';

/**
 * 🔴 U-32.1: the criteria a row's «→» opens on the results (U-20, the application's `buildSectionCriteria`): its
 * scope's facts as the search's fields — the «Τι» and «Πού» by their words, the structured selections, the
 * availability.
 */
export function buildSectionCriteria(link: SearchDoctorsSectionLink): SearchDoctorsCriteria {
	return {
		...defaultSearchDoctorsCriteria,
		availability: link.availability,
		what: link.what?.label ?? '',
		where: link.where?.label ?? '',
		whatSelection: link.what,
		whereSelection: link.where
	};
}

/** A row's cards in the page's language and the criteria its «→» opens (`null`: no link). */
function rowOf(
	items: SearchDoctorsSection['items'],
	link: SearchDoctorsSectionLink | null,
	lang: string
): Pick<HomeSection, 'doctors' | 'criteria'> {
	return {
		doctors: items.map((card) => buildDoctorCard(card, lang)),
		criteria: link ? buildSectionCriteria(link) : null
	};
}

/** A home row as the page shows it (U-32.1): its cards in the page's language and the criteria its «→» opens. */
export function buildHomeSection(section: SearchDoctorsSection, lang: string): HomeSection {
	return { id: section.id, ...rowOf(section.items, section.link, lang) };
}

/** A streamed row's answer as the page shows it: its cards and its «→» criteria, or its failure as it was. */
export function buildHomeRowResult(result: StreamedSectionResult, lang: string): HomeRowResult {
	if (result.status === 'error') return result;
	return {
		status: 'ok',
		...rowOf(result.items, result.link, lang),
		...(result.params === undefined ? {} : { params: result.params })
	};
}

/**
 * 🔴 U-32.1: the home's streamed rows as the page shows them, built where the server reads them (the route's load,
 * as before: the cards' words on the server, its clock, D-118): each row's promise mapped to its view. U-32.9: it never
 * rejects — a row the builder cannot write (or an answer that rejected after all) is the error, never an unhandled
 * rejection that takes the server down.
 */
export function buildStreamedHomeRows(
	sections: StreamedHomeSection[],
	lang: string
): StreamedHomeRow[] {
	return sections.map((section) => ({
		id: section.id,
		result: section.result
			.then((result) => buildHomeRowResult(result, lang))
			.catch((): HomeRowResult => ({ status: 'error' }))
	}));
}

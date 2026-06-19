import type { QueryClient } from '@tanstack/svelte-query';

import type { CategoryId } from '../../types';
import { resolveServiceSlug, resolveSpecialtyScope } from './resolvers';
import type { MarketplaceSearchParams } from './types';

/**
 * Scope fragment a selected category rail item contributes to every home section query.
 * `professionalIds` / `serviceSlugs` / `text` are layered onto each section's own
 * sort/availability/location scope. `all` contributes nothing.
 */
export type CategoryScope = Pick<
	MarketplaceSearchParams,
	'professionalIds' | 'serviceSlugs' | 'text'
>;

export const EMPTY_CATEGORY_SCOPE: CategoryScope = {};

const SPECIALTY_CATEGORIES: CategoryId[] = [
	'internal-medicine',
	'pediatrics',
	'cardiology',
	'dermatology'
];

/**
 * Search term used to resolve each specialty rail category into a real `professionalId`
 * via `/doctors/suggestions`. The rail uses slug-style ids (`cardiology`), while the
 * marketplace indexes professionals by display name (`Cardiologist`); this map bridges the
 * two so the suggestion lookup resolves (and the same term is the text fallback). Update
 * here if the professional taxonomy changes.
 */
const SPECIALTY_SEARCH_TERMS: Record<string, string> = {
	'internal-medicine': 'Internal Medicine',
	pediatrics: 'Pediatrician',
	cardiology: 'Cardiologist',
	dermatology: 'Dermatologist'
};

/**
 * Resolves the selected category rail item into a server-side scope fragment.
 *
 * - `all` -> no scope.
 * - `online` -> online-consultation service slug from `/facets` (text `online` fallback).
 * - specialty -> `professionalIds` via `/doctors/suggestions`, keyed by the professional
 *   display term in `SPECIALTY_SEARCH_TERMS` (same term is the text fallback).
 *
 * The returned object is serializable so it can feed the TanStack query key, ensuring a
 * category change refetches the sections.
 */
export async function resolveCategoryScope(
	queryClient: QueryClient,
	categoryId: CategoryId,
	lang: string,
	fetchImpl?: typeof fetch
): Promise<CategoryScope> {
	if (categoryId === 'all') {
		return EMPTY_CATEGORY_SCOPE;
	}

	if (categoryId === 'online') {
		const service = await resolveServiceSlug(queryClient, 'video-consultation', {
			lang,
			fallbackText: 'online',
			fetch: fetchImpl
		});

		if (service.serviceSlug) {
			return { serviceSlugs: [service.serviceSlug] };
		}

		return service.textFallback ? { text: service.textFallback } : EMPTY_CATEGORY_SCOPE;
	}

	if (SPECIALTY_CATEGORIES.includes(categoryId)) {
		const specialty = await resolveSpecialtyScope(queryClient, categoryId, {
			lang,
			fetch: fetchImpl,
			queryTerm: SPECIALTY_SEARCH_TERMS[categoryId]
		});

		if (specialty.professionalIds) {
			return { professionalIds: specialty.professionalIds };
		}

		return specialty.textFallback ? { text: specialty.textFallback } : EMPTY_CATEGORY_SCOPE;
	}

	return EMPTY_CATEGORY_SCOPE;
}

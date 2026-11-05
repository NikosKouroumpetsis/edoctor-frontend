import type { QueryClient, QueryKey } from '@tanstack/svelte-query';
import type {
	FavoriteDoctorIdsResponseView,
	FavoriteDoctorListResponseView,
	FavoriteDoctorSavedView
} from '$shared/lib/api-client';
import { ApiError, httpSessionDelete, httpSessionGet, httpSessionPut } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { mapCardToFacts } from '$modules/search-doctors/api/marketplace/card-adapter';
import type { SearchDoctorsCardFacts } from '$modules/search-doctors/api/marketplace/types';

const FAVORITES_PATH = '/patient/me/favorites';
// The hearts read this one small answer once, then keep it themselves (`patchFavoriteIds`): only a write changes it.
const IDS_STALE_MS = 5 * 60_000;

/** One saved doctor, as the marketplace's facts (U-85: the very card of the search) and when it was saved. */
export type FavoriteEntry = { savedAt: string; facts: SearchDoctorsCardFacts };

/** U-83.5: ONE flat list, the newest first; no groups. */
export type FavoritesList = { items: FavoriteEntry[]; total: number };

/** What a write keeps of a removed doctor in each language's list, so that «Αναίρεση» or a refusal can put it back. */
export type FavoriteEntrySnapshot = readonly (readonly [QueryKey, FavoriteEntry])[];

export const favoritesQueryKeys = {
	all: ['favorites'] as const,
	ids: () => ['favorites', 'ids'] as const,
	lists: () => ['favorites', 'list'] as const,
	list: (lang: string) => ['favorites', 'list', lang] as const,
	writes: () => ['favorites', 'write'] as const
};

/**
 * 🔴 An account with no patient's profile (a doctor): the server's `403` on `/patient/me/favorites*`. It is its answer,
 * no failure: the account simply has no favourites.
 */
export function isNotPatientAccount(error: unknown): boolean {
	return error instanceof ApiError && error.status === 403;
}

/** That answer is not asked twice: no retry (the kit's one for anything else)… */
const retryUnlessNotPatient = (failures: number, error: unknown) =>
	!isNotPatientAccount(error) && failures < 1;

/** …and no new read, by any heart or page, on a mount or a focus; a sign-out forgets it (`personalQueryMeta`). */
const askedUnlessNotPatient = (enabled: boolean) => (query: { state: { error: unknown } }) =>
	enabled && !isNotPatientAccount(query.state.error);

function fetchFavoriteIds(signal?: AbortSignal): Promise<string[]> {
	return httpSessionGet<FavoriteDoctorIdsResponseView>(`${FAVORITES_PATH}/ids`, { signal }).then(
		(data) => data.doctorIds
	);
}

async function fetchFavorites(lang: string, signal?: AbortSignal): Promise<FavoritesList> {
	const data = await httpSessionGet<FavoriteDoctorListResponseView>(FAVORITES_PATH, {
		params: { lang },
		signal
	});
	return {
		// A patient is signed in here, so the prices show (U-85: the server sends them, the search's card with them).
		items: data.items.map((item) => ({
			savedAt: item.savedAt,
			facts: mapCardToFacts(item.card, { pricingVisible: true })
		})),
		total: data.total
	};
}

/** The ids for every heart. 🔴 `enabled` is only a member's: a guest asks the server nothing (U-85). */
export function favoriteIdsQuery(enabled: boolean) {
	return {
		queryKey: favoritesQueryKeys.ids(),
		queryFn: ({ signal }: { signal?: AbortSignal }) => fetchFavoriteIds(signal),
		enabled: askedUnlessNotPatient(enabled),
		retry: retryUnlessNotPatient,
		staleTime: IDS_STALE_MS,
		meta: personalQueryMeta
	};
}

/** The page's list in a language. 🔴 As the ids: only a member's. */
export function favoritesListQuery(lang: string, enabled: boolean) {
	return {
		queryKey: favoritesQueryKeys.list(lang),
		queryFn: ({ signal }: { signal?: AbortSignal }) => fetchFavorites(lang, signal),
		enabled: askedUnlessNotPatient(enabled),
		retry: retryUnlessNotPatient,
		meta: personalQueryMeta
	};
}

/** `PUT`: idempotent, the token names the patient, the address the doctor; no body, no query (the API refuses them). */
export function saveFavorite(doctorId: string): Promise<FavoriteDoctorSavedView> {
	return httpSessionPut<FavoriteDoctorSavedView>(
		`${FAVORITES_PATH}/${encodeURIComponent(doctorId)}`
	);
}

/** `DELETE`: `204`, also for a doctor never saved. */
export function removeFavorite(doctorId: string): Promise<void> {
	return httpSessionDelete(`${FAVORITES_PATH}/${encodeURIComponent(doctorId)}`);
}

/** The heart's id in the one cached answer, at once (the optimistic write, or its way back). */
export function patchFavoriteIds(client: QueryClient, doctorId: string, saved: boolean) {
	client.setQueryDefaults(favoritesQueryKeys.ids(), { meta: personalQueryMeta });
	client.setQueryData<string[]>(favoritesQueryKeys.ids(), (ids = []) => {
		const others = ids.filter((id) => id !== doctorId);
		return saved ? [doctorId, ...others] : others;
	});
}

/** What each cached list knows of a doctor, read before it goes. */
export function readFavoriteEntries(client: QueryClient, doctorId: string): FavoriteEntrySnapshot {
	return client
		.getQueriesData<FavoritesList>({ queryKey: favoritesQueryKeys.lists() })
		.flatMap(([key, list]) => {
			const entry = list?.items.find((item) => item.facts.id === doctorId);
			return entry ? [[key, entry] as const] : [];
		});
}

/** The doctor leaves every cached list. */
export function dropFavoriteEntries(client: QueryClient, doctorId: string) {
	client.setQueriesData<FavoritesList>({ queryKey: favoritesQueryKeys.lists() }, (list) => {
		if (!list) return list;
		const items = list.items.filter((item) => item.facts.id !== doctorId);
		return { items, total: items.length };
	});
}

/** The doctor is back on top (U-83.1: the newest first, as the server orders a new save). */
export function restoreFavoriteEntries(client: QueryClient, entries: FavoriteEntrySnapshot) {
	for (const [key, entry] of entries) {
		client.setQueryData<FavoritesList>(key, (list) => {
			if (!list) return list;
			const items = [entry, ...list.items.filter((item) => item.facts.id !== entry.facts.id)];
			return { items, total: items.length };
		});
	}
}

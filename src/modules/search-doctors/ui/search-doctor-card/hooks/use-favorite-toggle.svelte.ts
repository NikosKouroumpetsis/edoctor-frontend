import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional, type ToastLeading, type ToastLift } from '$shared/ui/molecules/toast';
import {
	dropFavoriteEntries,
	favoriteIdsQuery,
	favoritesQueryKeys,
	isNotPatientAccount,
	patchFavoriteIds,
	readFavoriteEntries,
	removeFavorite,
	restoreFavoriteEntries,
	saveFavorite,
	type FavoriteEntrySnapshot
} from '$modules/search-doctors/api/favorites';
import { takePendingFavorite, writePendingFavorite } from '$modules/search-doctors/lib/favorites';
import { useSignIn } from './use-sign-in';

/** The doctor a heart is about: the id the server knows, and the photo its toast shows when there is one. */
export type FavoriteSubject = { id: string; imageUrl?: string | null };

type FavoriteWrite = {
	doctor: FavoriteSubject;
	saved: boolean;
	/** A removal's way back: what the lists knew of the doctor. */
	entries: FavoriteEntrySnapshot;
};

/** The «pop» of `animate-heart-pop` (`layout.css`): the mark comes off when it ends. */
const POP_MS = 420;
// One write at a time, whichever heart asked: the answers can never arrive in another order than the presses.
const WRITE_SCOPE = { id: 'favorites' };

/**
 * 🔴 U-85 (`20-favorites` Π4, app = web): the ONE writer of the favourites and the rule of every heart. A member's press
 * is seen at once (the cached ids, the lists, a toast with «Αναίρεση») and goes back with a toast if the server refuses;
 * a guest asks the server nothing: the sign-in opens over the page (19) and what the heart asked for goes on after it,
 * through a provider's redirect too (U-80.1 Ε4). A doctor already saved in that account writes nothing. An account with
 * no patient's profile (a doctor's) has no favourites: its press writes nothing and says so, and that is no failure.
 */
export function useFavoriteToggle(
	locale: () => SupportedLocale,
	options: { lift?: ToastLift } = {}
) {
	const queryClient = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const signIn = useSignIn(locale);
	const isMember = $derived(session?.isMember ?? false);
	const idsQuery = createQuery(() => favoriteIdsQuery(isMember));
	const ids = $derived(isMember ? (idsQuery.data ?? []) : []);
	// Read from the cache at the press: a query's result only keeps the fields a template has read (`data` here).
	const notPatient = () =>
		isMember && isNotPatientAccount(queryClient.getQueryState(favoritesQueryKeys.ids())?.error);
	let popping = $state<string | null>(null);
	let popTimer: ReturnType<typeof setTimeout> | undefined;
	let idsCut = false;

	const messageOptions = () => ({ locale: locale() });

	function pop(doctorId: string) {
		clearTimeout(popTimer);
		popping = doctorId;
		popTimer = setTimeout(() => {
			popping = null;
		}, POP_MS);
	}

	const leadingOf = (doctor: FavoriteSubject): ToastLeading =>
		doctor.imageUrl ? { kind: 'photo', src: doctor.imageUrl } : { kind: 'glyph', name: 'heart' };

	function patientsOnly() {
		toasts?.show({
			lift: options.lift,
			message: m.favorites_toast_patients_only({}, messageOptions())
		});
	}

	function refused(write: FavoriteWrite, error: unknown) {
		if (isNotPatientAccount(error)) {
			patientsOnly();
			return;
		}
		// R-5: the session ended under the page: no failure to retry: the sign-in opens, and the press goes on after it.
		if (error instanceof ApiError && error.status === 401) {
			if (write.saved) writePendingFavorite(write.doctor.id);
			session?.expire({
				action: 'fav',
				onSignedIn: () => {
					if (write.saved) void saveAfterSignIn(write.doctor);
					else send(write.doctor, false, { entries: write.entries });
				}
			});
			return;
		}
		const limit = write.saved && error instanceof ApiError && error.status === 409;
		toasts?.show({
			tone: 'danger',
			lift: options.lift,
			message: limit
				? m.favorites_toast_limit({}, messageOptions())
				: write.saved
					? m.favorites_toast_save_failed({}, messageOptions())
					: m.favorites_toast_remove_failed({}, messageOptions()),
			...(limit
				? {}
				: {
						action: {
							label: m.favorites_toast_retry({}, messageOptions()),
							onPress: () => send(write.doctor, write.saved, { entries: write.entries })
						}
					})
		});
	}

	const mutation = createMutation(() => ({
		mutationKey: favoritesQueryKeys.writes(),
		scope: WRITE_SCOPE,
		// Without a network the press fails at once and goes back, rather than waiting for one unseen.
		networkMode: 'always' as const,
		mutationFn: async ({ doctor, saved }: FavoriteWrite) => {
			if (saved) await saveFavorite(doctor.id);
			else await removeFavorite(doctor.id);
		},
		onMutate: async ({ doctor, saved, entries }: FavoriteWrite) => {
			// A read on its way knows nothing of this press: it must not overwrite it.
			idsCut ||= queryClient.isFetching({ queryKey: favoritesQueryKeys.ids() }) > 0;
			await queryClient.cancelQueries({ queryKey: favoritesQueryKeys.all });
			patchFavoriteIds(queryClient, doctor.id, saved);
			if (saved) restoreFavoriteEntries(queryClient, entries);
			else dropFavoriteEntries(queryClient, doctor.id);
		},
		onError: (error: unknown, write: FavoriteWrite) => {
			patchFavoriteIds(queryClient, write.doctor.id, !write.saved);
			if (write.saved) dropFavoriteEntries(queryClient, write.doctor.id);
			else restoreFavoriteEntries(queryClient, write.entries);
			refused(write, error);
		},
		onSettled: () => {
			if (queryClient.isMutating({ mutationKey: favoritesQueryKeys.writes() }) > 1) return;
			void queryClient.invalidateQueries({ queryKey: favoritesQueryKeys.lists() });
			if (idsCut) void queryClient.invalidateQueries({ queryKey: favoritesQueryKeys.ids() });
			idsCut = false;
		}
	}));

	function send(
		doctor: FavoriteSubject,
		saved: boolean,
		{ entries, undoing = false }: { entries?: FavoriteEntrySnapshot; undoing?: boolean } = {}
	) {
		const known = entries ?? (saved ? [] : readFavoriteEntries(queryClient, doctor.id));
		if (saved) pop(doctor.id);
		mutation.mutate({ doctor, saved, entries: known });
		if (undoing) {
			toasts?.dismiss();
			return;
		}
		toasts?.show({
			lift: options.lift,
			leading: leadingOf(doctor),
			message: saved
				? m.favorites_toast_saved({}, messageOptions())
				: m.favorites_toast_removed({}, messageOptions()),
			action: {
				label: m.favorites_toast_undo({}, messageOptions()),
				// Undoing a removal puts back what it took; undoing a save reads what is there by then.
				onPress: () =>
					send(doctor, !saved, saved ? { undoing: true } : { entries: known, undoing: true })
			}
		});
	}

	/** U-80.1 Ε4: the heart that waited for the sign-in; a doctor already in this account's favourites writes nothing. */
	async function saveAfterSignIn(doctor: FavoriteSubject) {
		takePendingFavorite();
		let known: string[] = [];
		try {
			known = await queryClient.ensureQueryData(favoriteIdsQuery(true));
		} catch (error) {
			if (isNotPatientAccount(error)) {
				patientsOnly();
				return;
			}
		}
		if (known.includes(doctor.id)) {
			toasts?.show({
				lift: options.lift,
				leading: leadingOf(doctor),
				message: m.favorites_toast_saved({}, messageOptions())
			});
			return;
		}
		send(doctor, true);
	}

	// A heart that went through the `/login` page or a provider's redirect goes on here, once.
	$effect(() => {
		if (!isMember || !session?.takeResumed('fav')) return;
		const doctorId = takePendingFavorite();
		if (doctorId) void saveAfterSignIn({ id: doctorId });
	});

	return {
		isSaved: (doctorId: string) => ids.includes(doctorId),
		/** The heart has just filled: its «pop» is playing. */
		isPopping: (doctorId: string) => popping === doctorId,
		/** The press of a heart, anywhere. */
		toggle(doctor: FavoriteSubject) {
			if (!isMember) {
				writePendingFavorite(doctor.id);
				signIn({ action: 'fav', onSignedIn: () => void saveAfterSignIn(doctor) });
				return;
			}
			if (notPatient()) {
				patientsOnly();
				return;
			}
			send(doctor, !ids.includes(doctor.id));
		},
		/** The press inside the favourites, where every card is saved whatever the ids have said so far. */
		remove(doctor: FavoriteSubject) {
			send(doctor, false);
		}
	};
}

export type FavoriteToggle = ReturnType<typeof useFavoriteToggle>;

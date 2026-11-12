import { createQuery } from '@tanstack/svelte-query';
import { ratingInvitationQuery, readRatingFailure } from '$modules/appointments/api/rating';

/**
 * Screen 54 (P-W4 §4.5, U-138.3): the invitation the address names, read in the browser for a member only (U-80.1 Ε6).
 * 🔴 Its patient's alone: a `403` / `404` — or an answer naming no invitation — is «Η πρόσκληση δεν είναι διαθέσιμη»,
 * never told apart from one that does not exist; any other failure is said with «Δοκιμάστε ξανά».
 */
export function useRatingInvitation(options: {
	invitationId: () => string;
	enabled: () => boolean;
}) {
	const query = createQuery(() => ({
		...ratingInvitationQuery(options.invitationId()),
		enabled: options.enabled()
	}));

	const live = $derived(options.enabled());
	const invitation = $derived(live ? (query.data ?? null) : null);
	const refused = $derived.by(() => {
		if (!live) return false;
		if (query.isSuccess && query.data === null) return true;
		if (!query.isError) return false;
		const kind = readRatingFailure(query.error).kind;
		return kind === 'not-accessible' || kind === 'blocked';
	});
	const failed = $derived(live && query.isError && !refused && invitation === null);

	return {
		get invitation() {
			return invitation;
		},
		get refused() {
			return refused;
		},
		get failed() {
			return failed;
		},
		get loading() {
			return live && invitation === null && !refused && !failed;
		},
		retry: () => void query.refetch()
	};
}

export type RatingInvitationRead = ReturnType<typeof useRatingInvitation>;

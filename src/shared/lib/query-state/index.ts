/** What a read is doing right now: FOUR answers, because two booleans hold only two (the application's). */
export type QueryReadState = 'answered' | 'waiting' | 'unavailable' | 'failed';

type QueryReadFacts = {
	fetchStatus: 'fetching' | 'paused' | 'idle';
	isError: boolean;
	isPending: boolean;
};

/**
 * 🔴 The one way to ask a TanStack read what it is doing (the application's `readQueryState`): `isPending` stays
 * true for a read that never runs, a read paused without a network is not «loading», and a failed read is not
 * pending. Only «answered» may say something negative («no results»); a paused read is `unavailable`, an error
 * with «Δοκιμάστε ξανά», never an empty list. It reads all three fields every time (a TanStack result notifies only
 * for the fields read).
 */
export function readQueryState(query: QueryReadFacts): QueryReadState {
	const { isPending, fetchStatus, isError } = query;
	if (isPending) return fetchStatus === 'fetching' ? 'waiting' : 'unavailable';
	return isError ? 'failed' : 'answered';
}

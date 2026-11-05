import type {
	HelpfulVoteCastResponseView,
	HelpfulVoteChoice,
	HelpfulVoteMineResponseView,
	HelpfulVoteReason,
	HelpfulVoteView
} from '$shared/lib/api-client';
import { httpGet, httpPublicPut } from '$shared/lib/http';

const VOTE_PATH = '/helpful-votes/public/vote';
const VOTER_HEADER = 'X-Helpful-Voter';

/** A device's own vote, and only that: 🔴 U-78.1 no answer here has room for a count. */
export type HelpfulVote = Pick<HelpfulVoteView, 'target' | 'value' | 'reason'>;

/** One read serves a page: an article's own, or every question of the FAQ together. */
export type HelpfulVoteScope = { target: string } | { kind: 'faq' };

export type HelpfulVoteWrite = {
	target: string;
	value: HelpfulVoteChoice;
	reason: HelpfulVoteReason | null;
	lang: string;
	voterKey: string | null;
};

export const helpfulVoteKeys = {
	mine: (scope: HelpfulVoteScope) =>
		['helpful', 'mine', 'kind' in scope ? scope.kind : scope.target] as const
};

// Names only what it keeps, whatever else an answer may hold.
const toVote = ({ target, value, reason }: HelpfulVoteView): HelpfulVote => ({
	target,
	value,
	reason
});

/** The device's votes (the key in a header, never in the address; no cookies: a vote names nobody). */
function fetchMyHelpfulVotes(
	scope: HelpfulVoteScope,
	voterKey: string,
	signal?: AbortSignal
): Promise<HelpfulVote[]> {
	return httpGet<HelpfulVoteMineResponseView>(`${VOTE_PATH}/mine`, {
		params: 'kind' in scope ? { kind: scope.kind } : { target: scope.target },
		headers: { [VOTER_HEADER]: voterKey },
		credentials: 'omit',
		signal
	}).then((votes) => votes.map(toVote));
}

/** The read. A device with no key yet has voted on nothing: it asks nothing, its answers live in the cache. */
export function helpfulVotesQuery(scope: HelpfulVoteScope, voterKey: string | null) {
	return {
		queryKey: helpfulVoteKeys.mine(scope),
		queryFn: ({ signal }: { signal?: AbortSignal }) =>
			voterKey ? fetchMyHelpfulVotes(scope, voterKey, signal) : Promise.resolve<HelpfulVote[]>([]),
		enabled: voterKey !== null,
		// Only this device changes it, and it does through the cache.
		staleTime: Infinity
	};
}

/** The vote; `none` takes it back. The answer's `voterKey` comes only when the server has just made it. */
export function castHelpfulVote(write: HelpfulVoteWrite): Promise<HelpfulVoteCastResponseView> {
	return httpPublicPut<HelpfulVoteCastResponseView>(VOTE_PATH, {
		body: {
			target: write.target,
			value: write.value,
			...(write.reason ? { reason: write.reason } : {}),
			lang: write.lang
		},
		headers: write.voterKey ? { [VOTER_HEADER]: write.voterKey } : undefined
	});
}

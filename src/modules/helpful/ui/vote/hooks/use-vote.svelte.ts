import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
	castHelpfulVote,
	helpfulVoteKeys,
	helpfulVotesQuery,
	type HelpfulVote,
	type HelpfulVoteScope
} from '$modules/helpful/api/vote';
import {
	HELPFUL_NO_ANSWER,
	nextHelpfulAnswer,
	nextHelpfulReason,
	readHelpfulVoterKey,
	writeHelpfulVoterKey,
	type HelpfulAnswer,
	type HelpfulChoice,
	type HelpfulReasonId
} from '$modules/helpful/lib/vote';

type VoteWrite = { answer: HelpfulAnswer; previous: HelpfulAnswer };

// One vote at a time on the whole page, so a device's first two presses never ask for two keys.
const WRITE_SCOPE = { id: 'helpful-vote' };

const scopeOf = (target: string): HelpfulVoteScope =>
	target.startsWith('faq:') ? { kind: 'faq' } : { target };

/**
 * 🔴 U-78 (`23-helpful` Π2–Π4): a device's answer on one article or question. Everyone may vote: no cookie, no name, only
 * the device's random key. The press is seen at once; a refusal or no network takes it back and `failed` says so.
 */
export function useHelpfulVote(target: () => string, locale: () => string) {
	const queryClient = useQueryClient();
	let voterKey = $state(readHelpfulVoterKey());
	let failed = $state(false);
	let readCut = false;
	const scope = $derived(scopeOf(target()));
	const mine = createQuery(() => helpfulVotesQuery(scope, voterKey));
	const answer = $derived.by<HelpfulAnswer>(() => {
		const vote = mine.data?.find((entry) => entry.target === target());
		if (!vote || vote.value === 'none') return HELPFUL_NO_ANSWER;
		return { value: vote.value, reason: vote.reason };
	});

	function remember(next: HelpfulAnswer) {
		const key = helpfulVoteKeys.mine(scope);
		queryClient.setQueryData<HelpfulVote[]>(key, (votes = []) => [
			...votes.filter((vote) => vote.target !== target()),
			...(next.value
				? [{ target: target(), value: next.value, reason: next.reason } satisfies HelpfulVote]
				: [])
		]);
	}

	const mutation = createMutation(() => ({
		scope: WRITE_SCOPE,
		// Without a network the press goes back at once, rather than waiting for one unseen.
		networkMode: 'always' as const,
		mutationFn: ({ answer: next }: VoteWrite) =>
			castHelpfulVote({
				target: target(),
				value: next.value ?? 'none',
				reason: next.reason,
				lang: locale(),
				// Read at the send: a vote before this one, on any question, may have just got the device its key.
				voterKey: readHelpfulVoterKey()
			}),
		onMutate: async ({ answer: next }: VoteWrite) => {
			failed = false;
			// A read on its way knows nothing of this press: it must not overwrite it.
			const key = helpfulVoteKeys.mine(scope);
			readCut ||= queryClient.isFetching({ queryKey: key }) > 0;
			await queryClient.cancelQueries({ queryKey: key });
			remember(next);
		},
		onSuccess: (data: { voterKey?: string }) => {
			if (data.voterKey) writeHelpfulVoterKey(data.voterKey);
			voterKey = readHelpfulVoterKey();
		},
		onError: (_error: unknown, { previous }: VoteWrite) => {
			remember(previous);
			failed = true;
		},
		onSettled: () => {
			// What was cut was the page's other answers too (the FAQ's one read): asked again, after this vote.
			if (readCut) void queryClient.invalidateQueries({ queryKey: helpfulVoteKeys.mine(scope) });
			readCut = false;
		}
	}));

	function write(next: HelpfulAnswer) {
		mutation.mutate({ answer: next, previous: answer });
	}

	return {
		get answer() {
			return answer;
		},
		get failed() {
			return failed;
		},
		press: (pressed: HelpfulChoice) => write(nextHelpfulAnswer(answer, pressed)),
		pressReason: (pressed: HelpfulReasonId) => write(nextHelpfulReason(answer, pressed))
	};
}

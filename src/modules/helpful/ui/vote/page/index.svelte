<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { HelpfulFeedback } from '$shared/ui/molecules/helpful-feedback';
	import type { HelpfulReasonId } from '$modules/helpful/lib/vote';
	import { helpfulReasonIds } from '$modules/helpful/lib/vote';
	import { useHelpfulVote } from '../hooks/use-vote.svelte';
	import type { HelpfulVoteProps } from '../types';

	let { target, size = 'md', locale, testId = 'helpful-feedback' }: HelpfulVoteProps = $props();

	const options = $derived({ locale });
	const vote = useHelpfulVote(
		() => target,
		() => locale
	);
	const reasonLabels = $derived<Record<HelpfulReasonId, string>>({
		'not-answered': m.helpful_reason_not_answered({}, options),
		unclear: m.helpful_reason_unclear({}, options),
		outdated: m.helpful_reason_outdated({}, options)
	});
	const reasons = $derived(helpfulReasonIds.map((id) => ({ id, label: reasonLabels[id] })));
</script>

<!-- 🔴 U-78.1: the device's own answer and nothing else: no count of anyone's. -->
<HelpfulFeedback
	{size}
	value={vote.answer.value}
	reason={vote.answer.reason}
	{reasons}
	question={m.helpful_question({}, options)}
	thanks={m.helpful_thanks({}, options)}
	undone={m.helpful_undone({}, options)}
	upLabel={m.helpful_up({}, options)}
	downLabel={m.helpful_down({}, options)}
	reasonsTitle={m.helpful_reasons_title({}, options)}
	failedMessage={vote.failed ? m.helpful_failed({}, options) : null}
	onVote={vote.press}
	onReason={(id) => vote.pressReason(id as HelpfulReasonId)}
	{testId}
/>

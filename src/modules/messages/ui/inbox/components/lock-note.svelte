<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let { words }: { words: string } = $props();
</script>

<!-- Who reads this (and 112 / 166 on the patient's side), at the top of every conversation. -->
<p
	data-testid="messages-note"
	class="mx-auto mb-4 flex max-w-narrow flex-row items-start gap-2 rounded-md bg-background px-3 py-2 text-label-lg font-normal text-muted-foreground tablet:mt-1 tablet:mb-2 tablet:max-w-card-wide tablet:px-3.5 tablet:py-2.5"
>
	<Ionicon name="lock-closed-outline" class="mt-0.5 icon-sm shrink-0" />
	<span>{words}</span>
</p>

<script lang="ts">
	import { Button } from '$shared/ui/primitives/button';

	let {
		title,
		body,
		action,
		href,
		onOpen,
		testId,
		actionTestId
	}: {
		/** The offer's question, already localized («Θέλετε απλώς άλλη ώρα;»). */
		title: string;
		/** What it would do instead, one line under it. */
		body: string;
		/** The way there («Αλλαγή ώρας»). */
		action: string;
		/** That screen's own address, already resolved (a link: a new tab still opens it). */
		href: string;
		/** A plain press: the page opens the screen itself, so leaving it can come back (U-102). */
		onOpen: (event: MouseEvent) => void;
		testId?: string;
		actionTestId?: string;
	} = $props();
</script>

<!-- `appt.css:346-349` · U-137.3 (the 53's, shared since D-W51-51 for the 69): another way, offered over a form — the
     words on the left, the action outlined on the right; a screen of its own one step on (U-102). -->
<div
	data-slot="action-offer"
	data-testid={testId}
	class="mb-2 flex flex-row items-center justify-between gap-3 rounded-md border border-line-2 px-4 py-3.5"
>
	<div class="min-w-0">
		<p class="text-body-md font-semibold text-foreground">{title}</p>
		<p class="text-label-lg font-normal text-muted-foreground">{body}</p>
	</div>
	<Button
		tone="outline"
		radius="md"
		hover={false}
		{href}
		label={action}
		textClass="text-body-sm"
		onclick={onOpen}
		data-testid={actionTestId}
		class="shrink-0"
	/>
</div>

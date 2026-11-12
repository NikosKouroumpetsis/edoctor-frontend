<script lang="ts">
	import { Button } from '$shared/ui/primitives/button';

	let {
		title,
		body,
		action,
		href,
		onOpen
	}: {
		/** «Θέλετε απλώς άλλη ώρα;» */
		title: string;
		/** «Αλλάξτε την ώρα και το ραντεβού μένει.» / «…το αίτημα μένει.» */
		body: string;
		/** «Αλλαγή ώρας» */
		action: string;
		/** Screen 52's «Αλλαγή ώρας» of the same appointment (a link: a new tab still opens it). */
		href: string;
		onOpen: (event: MouseEvent) => void;
	} = $props();
</script>

<!-- `appt.css:346-349` · U-137.3: «Θέλετε απλώς άλλη ώρα;», always over the reasons while the hour may move — the
     words on the left, «Αλλαγή ώρας» outlined on the right; a screen of its own one step on (U-102). -->
<div
	data-testid="appointment-cancel-offer"
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
		data-testid="appointment-cancel-offer-time"
		class="shrink-0"
	/>
</div>

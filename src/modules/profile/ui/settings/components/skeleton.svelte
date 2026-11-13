<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { label }: { label: string } = $props();

	const ROWS = [0, 1];
</script>

<!-- The right column while the session is not known yet: a title and two rows wait, in the section's own box. -->
<div
	data-testid="settings-section-loading"
	aria-busy="true"
	aria-label={label}
	class="px-gutter-sm pt-3 pb-pane-inset-lg tablet:pt-section split:p-0"
>
	<div class="mx-auto grid w-full max-w-form gap-5 split:max-w-none" aria-hidden="true">
		<Skeleton class="h-control-xs w-1/2 rounded-md" />
		{#each ROWS as row (row)}
			<Skeleton class="h-control-lg w-full rounded-md" />
		{/each}
	</div>
</div>

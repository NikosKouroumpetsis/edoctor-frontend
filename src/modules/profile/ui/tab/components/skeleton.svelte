<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { label }: { label: string } = $props();

	const ROWS = [0, 1, 2, 3];
</script>

<!-- The «Προφίλ» while the session is not known yet (the page's server knows nobody, U-80.1 Ε6): the name card's box
     and the rows wait — never a guest's page that turns into a member's a moment later. -->
<div data-testid="profile-loading" aria-busy="true" aria-label={label} class="mt-3 grid gap-3.5">
	<div aria-hidden="true" class="grid gap-3.5">
		<Skeleton class="h-placeholder-xl w-full rounded-xl" />
		<Skeleton class="h-row-lg w-full rounded-xl" />
		{#each ROWS as row (row)}
			<Skeleton class="h-control-md w-full rounded-md" />
		{/each}
	</div>
</div>

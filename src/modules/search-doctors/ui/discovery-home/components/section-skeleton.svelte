<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	const cardPlaceholders = Array.from({ length: 3 }, (_, index) => index);
</script>

<div class="flex flex-col gap-3.5">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-1 flex-col gap-2">
			<Skeleton class="h-6 w-3/4 rounded-full" />
			<Skeleton class="h-5 w-3/5 rounded-full" />
		</div>
		<Skeleton class="mt-0.5 size-control-sm rounded-full" />
	</div>
	<div class="flex gap-rail overflow-hidden pb-1">
		{#each cardPlaceholders as cardIndex (cardIndex)}
			<div class="flex w-card-rail-w shrink-0 flex-col gap-2.5 tablet:w-card-rail-w-lg">
				<Skeleton class="h-card-rail-media w-full rounded-xl tablet:h-card-rail-media-lg" />
				<Skeleton class="h-6 w-4/5 rounded-full" />
				<Skeleton class="h-5 w-3/5 rounded-full" />
				<Skeleton class="h-4 w-2/3 rounded-full" />
				<Skeleton class="h-4 w-1/2 rounded-full" />
				<div class="flex flex-wrap items-center gap-3 pt-1">
					<Skeleton class="h-4 w-1/2 rounded-full" />
					<Skeleton class="h-4 w-1/4 rounded-full" />
					<Skeleton class="h-4 w-1/4 rounded-full" />
				</div>
			</div>
		{/each}
	</div>
</div>

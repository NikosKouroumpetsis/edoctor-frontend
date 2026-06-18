<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	const categoryPlaceholders = Array.from({ length: 6 }, (_, index) => index);
	const sectionPlaceholders = Array.from({ length: 3 }, (_, index) => index);
	const cardPlaceholders = Array.from({ length: 3 }, (_, index) => index);
</script>

<div class="flex flex-col gap-8">
	<!-- Category rail skeleton -->
	<div class="-mx-1 flex gap-5 px-1 py-2">
		{#each categoryPlaceholders as index (index)}
			<div class="flex flex-col items-center gap-2">
				<Skeleton class="size-14 rounded-full" />
				<Skeleton class="h-4 w-16 rounded-full" />
			</div>
		{/each}
	</div>

	<!-- Section skeletons -->
	{#each sectionPlaceholders as sectionIndex (sectionIndex)}
		<div class="flex flex-col gap-3.5">
			<div class="flex items-start justify-between gap-4">
				<div class="flex flex-1 flex-col gap-2">
					<Skeleton class="h-8 w-3/4 rounded-full" />
					<Skeleton class="h-5 w-3/5 rounded-full" />
				</div>
				<Skeleton class="mt-0.5 size-10 rounded-full" />
			</div>
			<div class="flex gap-3 overflow-hidden pb-1">
				{#each cardPlaceholders as cardIndex (cardIndex)}
					<div class="flex w-42 shrink-0 flex-col gap-2.5 md:w-54">
						<Skeleton class="h-38 w-full rounded-media md:h-47" />
						<Skeleton class="h-6 w-4/5 rounded-full" />
						<Skeleton class="h-5 w-3/5 rounded-full" />
						<Skeleton class="h-4 w-2/3 rounded-full" />
						<Skeleton class="h-4 w-1/2 rounded-full" />
						<div class="flex flex-wrap items-center gap-3 pt-1">
							<Skeleton class="h-4 w-20 rounded-full" />
							<Skeleton class="h-4 w-12 rounded-full" />
							<Skeleton class="h-4 w-12 rounded-full" />
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import SectionSkeleton from './section-skeleton.svelte';

	const categoryPlaceholders = Array.from({ length: 6 }, (_, index) => index);
	const sectionPlaceholders = Array.from({ length: 3 }, (_, index) => index);
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
		<SectionSkeleton />
	{/each}
</div>

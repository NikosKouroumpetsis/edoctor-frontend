<script lang="ts">
	import { SkeletonLines } from '$shared/ui/molecules/skeleton-lines';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
</script>

<!-- The list's placeholder in the card's own shape (U-57.2): the 4:3 photo, two lines of title, the meta. Decorative;
     it breathes through the kit's `Skeleton` whatever the device's motion setting (U-12.1). -->
<div data-slot="article-card-skeleton" aria-hidden="true" class="flex w-full flex-col gap-2.5">
	<Skeleton class="aspect-4/3 h-auto w-full rounded-lg" />
	<SkeletonLines
		lines={[{ width: 'w-full' }, { width: 'w-3/4' }, { height: 'h-3', width: 'w-1/2' }]}
	/>
</div>

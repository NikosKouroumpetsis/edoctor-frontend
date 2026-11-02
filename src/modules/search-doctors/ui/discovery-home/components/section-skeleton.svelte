<script lang="ts">
	import { RAIL_CARDS_PER_VIEW, Rail } from '$shared/ui/organisms/rail';
	import { cn } from '$shared/lib/utils';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { searchDoctorCardMedia } from '$modules/search-doctors/ui/search-doctor-card';

	const cards = Array.from({ length: 8 }, (_, index) => index);
</script>

<!-- A row while its doctors load (U-20): the kit's breathing skeleton in the row's own cells (the same zone map as
     the cards, so nothing moves when they arrive) — a title line, then the 1:1 photo and three lines per card. -->
<div data-slot="home-row-skeleton" aria-hidden="true" class="flex flex-col gap-3.5">
	<Skeleton class="h-5.5 w-3/5 rounded-sm tablet:w-1/3" />
	<Rail perView={RAIL_CARDS_PER_VIEW} class="pointer-events-none overflow-hidden">
		{#each cards as card (card)}
			<div>
				<div class="flex w-full flex-col gap-2">
					<Skeleton class={cn(searchDoctorCardMedia.rail.skeletonClass, 'w-full rounded-lg')} />
					<Skeleton class="h-3.5 w-4/5 rounded-sm" />
					<Skeleton class="h-3 w-3/5 rounded-sm" />
					<Skeleton class="h-3 w-2/5 rounded-sm" />
				</div>
			</div>
		{/each}
	</Rail>
</div>

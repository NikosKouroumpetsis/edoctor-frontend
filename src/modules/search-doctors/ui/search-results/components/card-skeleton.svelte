<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { searchDoctorCardMedia } from '$modules/search-doctors/ui/search-doctor-card';
</script>

<!-- §7.7: a results card while it loads — the 4:3 photo and three lines, breathing (the kit's skeleton). -->
<div data-slot="results-card-skeleton" aria-hidden="true" class="flex w-full flex-col gap-3">
	<Skeleton class={cn(searchDoctorCardMedia.list.skeletonClass, 'w-full rounded-lg')} />
	<div class="flex flex-col gap-2">
		<Skeleton class="h-4 w-4/5 rounded-xs" />
		<Skeleton class="h-4 w-3/5 rounded-xs" />
		<Skeleton class="h-4 w-2/5 rounded-xs" />
	</div>
</div>

<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type MapThumbnailProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'>;
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let { class: className, ...restProps }: MapThumbnailProps = $props();
</script>

<!-- A tiny map excerpt pinned over a photo's bottom-end corner, 12 in (M-01β): three faint streets and a pin,
     theme colours only, no map library. Inert: not pressable and hidden from assistive tech. -->
<div
	aria-hidden="true"
	data-slot="map-thumbnail"
	class={cn(
		'pointer-events-none absolute right-3 bottom-3 size-control-md overflow-hidden rounded-lg border border-border bg-card',
		className
	)}
	{...restProps}
>
	<span
		data-slot="map-thumbnail-street"
		class="absolute top-3 -left-2 h-2 w-3/2 rotate-[18deg] bg-muted-foreground/18"
	></span>
	<span
		data-slot="map-thumbnail-street"
		class="absolute top-6 -left-2 h-2 w-3/2 -rotate-[12deg] bg-muted-foreground/14"
	></span>
	<span
		data-slot="map-thumbnail-street"
		class="absolute top-0 left-4 h-3/2 w-2 rotate-[10deg] bg-muted-foreground/14"
	></span>
	<span class="absolute inset-0 flex items-center justify-center">
		<Ionicon name="location" class="icon-md text-primary" />
	</span>
</div>

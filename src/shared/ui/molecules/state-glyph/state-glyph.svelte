<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';

	let {
		name,
		class: className
	}: {
		/** The state's glyph (an Ionicon of the kit). */
		name: IoniconName;
		class?: string;
	} = $props();
</script>

<!-- The glyph over an empty or failed state's words (the `icon` of `EmptyState` / `ErrorState`): the 24 glyph in the
     56 round tile on the 5 % tint (the application's `StateGlyph`, U-03.4), decorative — the words say it. MINOR-6 (U-29). -->
<span
	data-slot="state-glyph"
	class={cn(
		'grid size-tile place-items-center rounded-full bg-foreground/5 text-foreground',
		className
	)}
>
	<Ionicon {name} class="icon-lg" />
</span>

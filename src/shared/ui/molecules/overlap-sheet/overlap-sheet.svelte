<script lang="ts" module>
	/** The zone from which the sheet is a plain column (under the web's `PhotoGrid`), or `none` to keep it. */
	export type OverlapSheetFlatFrom = 'tablet' | 'none';

	// From that zone nothing overlaps: no rise, frame, corner, surface or inset; the blocks keep their `section`.
	const flatFromClasses: Record<OverlapSheetFlatFrom, string> = {
		tablet:
			'tablet:mt-0 tablet:rounded-none tablet:border-0 tablet:bg-transparent tablet:px-0 tablet:pt-0',
		none: ''
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		flatFrom = 'tablet',
		testId,
		class: className,
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		flatFrom?: OverlapSheetFlatFrom;
		testId?: string;
		children?: Snippet;
	} = $props();
</script>

<!-- The application's sheet (M-21): it rises `hero-overlap` (32) over the photo above it, a hairline frame open at
     the bottom, the `xl` corner on top, 20 in and its blocks `section` apart; `relative` keeps it over the photo. -->
<div
	data-slot="overlap-sheet"
	data-testid={testId}
	class={cn(
		'relative -mt-hero-overlap flex flex-col gap-section rounded-t-xl border-x border-t border-border/60 bg-card px-5 pt-5 pb-section',
		flatFromClasses[flatFrom],
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>

<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type MediaBadgeWidth = 'auto' | 'badge';

	export type MediaBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		label: string;
		/** One line (an article's type) or two (a doctor's badge, which also takes the `badge` width). */
		maxLines?: 1 | 2;
		/**
		 * `auto` hugs the label; `badge` (the doctor card's) is at least `badge-w` and grows with its words up to the
		 * photo's width less both 12 insets (U-06.3), wrapping to `maxLines` before any «…».
		 */
		width?: MediaBadgeWidth;
		/** A `badge` beside the photo's action (the heart): it stops a 48 touch box short of the end, not 12. */
		besideAction?: boolean;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		label,
		maxLines = 1,
		width = 'auto',
		besideAction = false,
		class: className,
		...restProps
	}: MediaBadgeProps = $props();
</script>

<!--
	The label pinned to a photo's top-left corner (M-03); the photo's frame is `relative`. The `badge` width is a
	minimum: `w-fit` between `left-3` and `right-3` stops at the photo less its insets. The whole words are the
	`title` too, for a pointer over a cut label (U-06.3); a press on the badge is the photo's.
-->
<span
	data-slot="media-badge"
	title={label}
	class={cn(
		'absolute top-3 left-3 rounded-md bg-card px-3 py-1.5 shadow-raised',
		width === 'badge' && ['w-fit min-w-badge-w', besideAction ? 'right-touch' : 'right-3'],
		className
	)}
	{...restProps}
>
	<span
		class={cn(
			'block text-label-md font-bold text-foreground',
			maxLines === 1 ? 'line-clamp-1' : 'line-clamp-2'
		)}
	>
		{label}
	</span>
</span>

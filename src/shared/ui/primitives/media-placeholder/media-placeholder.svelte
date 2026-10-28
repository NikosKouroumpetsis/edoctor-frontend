<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type MediaPlaceholderFill = 'border' | 'muted-foreground';

	const fillClasses: Record<MediaPlaceholderFill, string> = {
		border: 'fill-border',
		'muted-foreground': 'fill-muted-foreground'
	};

	export type MediaPlaceholderProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The silhouette's colour token (the application's `fill`, the theme's `border` by default). */
		fill?: MediaPlaceholderFill;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let { fill = 'border', class: className, ...restProps }: MediaPlaceholderProps = $props();
</script>

<!-- The ONE picture of a person without a photo (S-32.8): a silhouette on the muted surface, cropped to fill
     its frame; the caller sizes the frame. Decorative: the card or hero names the person. -->
<div
	aria-hidden="true"
	data-slot="media-placeholder"
	class={cn('w-full overflow-hidden bg-muted', className)}
	{...restProps}
>
	<svg
		viewBox="0 0 400 300"
		preserveAspectRatio="xMidYMid slice"
		focusable="false"
		class={cn('block size-full', fillClasses[fill])}
	>
		<circle cx="200" cy="118" r="50" />
		<path d="M120 264c0-44 36-80 80-80s80 36 80 80v36H120z" />
	</svg>
</div>

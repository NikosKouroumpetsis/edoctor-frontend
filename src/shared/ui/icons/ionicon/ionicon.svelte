<script lang="ts" module>
	import { ionicons, type IoniconName } from './glyphs';

	/** Every glyph the kit carries, in name order (the story and the tests walk it). */
	export const ioniconNames = Object.keys(ionicons) as IoniconName[];
</script>

<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		name,
		label,
		class: className,
		...restProps
	}: Omit<SVGAttributes<SVGSVGElement>, 'name'> & {
		/** The application's Ionicons name (`heart-outline`, `chevron-back` …). */
		name: IoniconName;
		/** Accessible name when the glyph stands alone; without it the glyph is decorative. */
		label?: string;
	} = $props();
</script>

<!-- One glyph of the font the application draws, on its 512 artboard; size and colour come from the
     caller's classes (`icon-md`, `text-foreground`), the default is the `md` icon in the text colour. -->
<svg
	viewBox="0 0 512 512"
	fill="currentColor"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
	data-slot="ionicon"
	data-icon={name}
	class={cn('icon-md shrink-0', className)}
	{...restProps}
>
	<path d={ionicons[name]} />
</svg>

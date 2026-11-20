<script lang="ts" module>
	/** The glyph's lines, for a caller that draws it without Svelte (an editor's own node). */
	export const PICTURE_GLYPH = {
		path: 'M3.5 17.5 9 12l4 4 2.5-2.5 5 5',
		circle: { cx: '15.5', cy: '8.5', r: '2' }
	} as const;
</script>

<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		strokeWidth = 1.4,
		class: className,
		...restProps
	}: SVGAttributes<SVGSVGElement> & {
		/** The stroke's weight, in the 24 box (a picture's place draws it 1.4 at 40, as the prototype). */
		strokeWidth?: number;
	} = $props();
</script>

<!-- Wave 5.2 · screen 85: the article prototype's picture (`review/wave5/64-switch/sw.js:679`, `AR_PIC`), path for path —
     a hill and a sun, line art in the text's colour (`currentColor`), where a picture is not there. -->
<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
	data-slot="picture"
	class={cn('size-figure-glyph shrink-0', className)}
	{...restProps}
>
	<path d={PICTURE_GLYPH.path} />
	<circle cx={PICTURE_GLYPH.circle.cx} cy={PICTURE_GLYPH.circle.cy} r={PICTURE_GLYPH.circle.r} />
</svg>

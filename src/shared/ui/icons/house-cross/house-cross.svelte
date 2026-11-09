<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		strokeWidth = 2,
		class: className,
		...restProps
	}: SVGAttributes<SVGSVGElement> & {
		/** The outline's weight, in the 24 box (2: the line icons beside it, as the prototype draws all of a row alike). */
		strokeWidth?: number;
	} = $props();
</script>

<!-- 🔴 U-129.1: the doctor sign-up prototype's own icon «clinic» (`review/wave3/33-doctor/doctor.js:30`), path for path:
     a house under a pitched roof with a cross in it; no icon set has it. Line art in the text's colour (`currentColor`). -->
<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
	data-slot="house-cross"
	class={cn('icon-lg shrink-0', className)}
	{...restProps}
>
	<path d="M3.5 20.5h17M5.5 20.5V9.5l6.5-5 6.5 5v11" />
	<path d="M12 10.5v5M9.5 13h5" />
</svg>

<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		strokeWidth = 2,
		class: className,
		...restProps
	}: SVGAttributes<SVGSVGElement> & {
		/** The stroke's weight, in the 24 box (a checkbox draws it 3.4 at 14, as the prototype). */
		strokeWidth?: number;
	} = $props();
</script>

<!-- 🔴 U-129: the doctor sign-up prototype's own tick (`review/wave3/33-doctor/doctor.js:38`, `tick`), path for path; line
     art in the text's colour (`currentColor`). -->
<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
	data-slot="tick"
	class={cn('icon-lg shrink-0', className)}
	{...restProps}
>
	<path d="M5 12.5 10 17.5 19.5 7" />
</svg>

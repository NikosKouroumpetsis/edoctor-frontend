<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		strokeWidth = 1.5,
		class: className,
		...restProps
	}: SVGAttributes<SVGSVGElement> & {
		/** The outline's weight (the application draws 1.5, the large score 1.8). */
		strokeWidth?: number;
	} = $props();
</script>

<!-- Hugeicons «laurel wreath left 01» (24 × 24), the application's left laurel of a rating; follows the text colour. -->
<svg
	viewBox="0 0 24 24"
	fill="none"
	aria-hidden="true"
	focusable="false"
	data-slot="laurel-wreath-left"
	class={cn('icon-lg shrink-0', className)}
	{...restProps}
>
	<path
		stroke="currentColor"
		stroke-linejoin="round"
		stroke-width={strokeWidth}
		d="M9.246 6.611c-.213 1.642 1.104 3.166 1.104 3.166s1.663-1.138 1.876-2.78c.213-1.643-1.104-3.167-1.104-3.167S9.46 4.97 9.246 6.611ZM7.683 12.13c.696 1.503 2.624 2.093 2.624 2.093s.8-1.847.104-3.35s-2.624-2.094-2.624-2.094s-.8 1.848-.104 3.351Zm.821 5.285c1.328.993 3.306.599 3.306.599s-.176-2.005-1.504-2.998S7 14.417 7 14.417s.176 2.005 1.504 2.998Zm3.609 4.298c1.505.698 3.359-.095 3.359-.095s-.587-1.925-2.092-2.624c-1.505-.698-3.358.096-3.358.096s.586 1.925 2.091 2.623Zm1.668-18.745c-1.21 1.133-1.164 3.144-1.164 3.144s2.01.176 3.22-.957s1.164-3.145 1.164-3.145s-2.01-.175-3.22.958Z"
	/>
</svg>

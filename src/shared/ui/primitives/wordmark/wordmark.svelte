<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { brandName } from '$shared/design/tokens';
	import { cn } from '$shared/lib/utils';

	let {
		as = 'p',
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLElement>, 'children'> & {
		/** The tag: a heading on a sign-in surface, a paragraph elsewhere. */
		as?: string;
	} = $props();
</script>

<!-- The brand lockup as words (the application's `brand-mark`): the name is the `brandName` token, never spelled here. -->
<svelte:element
	this={as}
	data-slot="wordmark"
	class={cn('text-display-xs font-bold tracking-tight text-primary-text', className)}
	{...restProps}
>
	{brandName}
</svelte:element>

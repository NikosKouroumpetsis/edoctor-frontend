<script lang="ts" module>
	import { motion } from '$shared/design/tokens';

	/** The application's open and close (`accordionAnimationDuration`), the `accordion` motion token. */
	export const ACCORDION_DURATION = motion.duration.accordion;
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Presence } from '$shared/lib/headless';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getAccordionItemContext } from './accordion-item.svelte';

	let {
		ref = $bindable(null),
		contentClass,
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		/**
		 * The inner column (the application's `contentClassName`); `class` is the clipping box around it. A card's
		 * padding comes after it, as the application's.
		 */
		contentClass?: string;
	} = $props();

	const item = getAccordionItemContext();
	// In the DOM until its CSS close ends (U-12.2).
	const presence = new Presence(() => item.open, { duration: 'accordion' });
</script>

<!-- The application's motion in CSS (U-12.2): the height and the opacity together on its 220 ms `inOut(quad)`
     (`duration-accordion ease-accordion`, the `progress` of `accordionAnimationDuration` + `withTiming`'s default).
     The height is the one grid row going 0fr ⇔ 1fr (the row is the content's height times the fraction, as the
     application's `contentHeight * progress`), its cell `min-h-0` so the row can close; in with `starting:`, out
     with `data-[state=closed]:`. -->
{#if presence.present}
	<div
		bind:this={ref}
		use:presence.track
		role="region"
		id={item.contentId}
		aria-labelledby={item.triggerId}
		data-slot="accordion-content"
		data-state={presence.state}
		inert={presence.closing}
		class={cn(
			'grid grid-rows-[1fr] overflow-hidden transition-[grid-template-rows,opacity] duration-accordion ease-accordion data-[state=closed]:pointer-events-none data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0 starting:grid-rows-[0fr] starting:opacity-0',
			className
		)}
		{...restProps}
	>
		<div data-slot="accordion-content-cell" class="min-h-0 overflow-hidden">
			<div
				data-slot="accordion-content-inner"
				class={cn('flex flex-col', contentClass, item.variant === 'card' && 'px-4 pt-1 pb-4')}
			>
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}

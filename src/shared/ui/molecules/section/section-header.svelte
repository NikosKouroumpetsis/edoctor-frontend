<script lang="ts" module>
	/**
	 * The three section looks of the application (D5): `plain` the home rails' header (`CarouselSection`), `ruled` the
	 * profile's sections (M-12), `divided` the filter modal's (M-37).
	 */
	export type SectionVariant = 'plain' | 'ruled' | 'divided';

	export const sectionTitleClasses: Record<SectionVariant, string> = {
		plain: 'text-title-lg font-bold text-foreground tablet:text-heading-sm',
		ruled: 'text-title-lg font-bold text-foreground',
		divided: 'text-title-xs font-semibold text-foreground'
	};

	export const sectionSubtitleClasses: Record<SectionVariant, string> = {
		plain: 'text-body-md text-muted-foreground',
		ruled: 'text-body-md text-muted-foreground',
		divided: 'text-body-sm text-muted-foreground'
	};

	const stackClasses: Record<SectionVariant, string> = {
		plain: 'gap-1',
		ruled: 'gap-1',
		divided: 'gap-0.5'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';

	let {
		title,
		subtitle,
		variant = 'plain',
		as = 'h2',
		id,
		trailing,
		end,
		class: className
	}: {
		title?: string;
		subtitle?: string;
		variant?: SectionVariant;
		/** The heading tag: the look is the variant, the level is the page's (`h2`, `h3` …). */
		as?: string;
		/** The heading's id, for a region the caller names by it (`aria-labelledby`). */
		id?: string;
		/** The control right after the title, on its line (U-20: the rail's «→», as the application's). */
		trailing?: Snippet;
		/** Web only: controls at the row's end (the rail's ‹ › from 744). */
		end?: Snippet;
		class?: string;
	} = $props();
</script>

<div
	data-slot="section-header"
	class={cn('flex flex-row items-start justify-between gap-4', className)}
>
	<div class={cn('flex min-w-0 flex-1 flex-col', stackClasses[variant])}>
		{#if title && trailing}
			<div data-slot="section-title-row" class="flex flex-row items-center gap-2.5">
				<svelte:element
					this={as}
					{id}
					data-slot="section-title"
					class={sectionTitleClasses[variant]}
				>
					{title}
				</svelte:element>
				{@render trailing()}
			</div>
		{:else if title}
			<svelte:element this={as} {id} data-slot="section-title" class={sectionTitleClasses[variant]}>
				{title}
			</svelte:element>
		{/if}
		{#if subtitle}
			<p data-slot="section-subtitle" class={sectionSubtitleClasses[variant]}>{subtitle}</p>
		{/if}
	</div>
	{@render end?.()}
</div>

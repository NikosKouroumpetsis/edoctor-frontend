<script lang="ts" module>
	import type { SectionVariant } from './section-header.svelte';

	// The column of each look, class for class: `ruled` its hairline and `pt-section` above (unless `showRule` is
	// off, the first section), `divided` a `Divider` before it, `plain` the rails' 14 between header and body.
	const columnClasses: Record<SectionVariant, string> = {
		plain: 'gap-3.5',
		ruled: 'gap-5',
		divided: 'gap-3'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { Divider } from '$shared/ui/primitives/divider';
	import SectionHeader from './section-header.svelte';

	let {
		title,
		subtitle,
		variant = 'plain',
		showRule = true,
		as = 'section',
		headingAs = 'h2',
		titleId,
		trailing,
		class: className,
		children,
		...restProps
	}: HTMLAttributes<HTMLElement> & {
		title?: string;
		subtitle?: string;
		variant?: SectionVariant;
		/** The rule of `ruled` / `divided`; off for the first section of a column. */
		showRule?: boolean;
		as?: string;
		headingAs?: string;
		/** The id of the title, for a region the caller names by it. */
		titleId?: string;
		/** A control at the end of the header row. */
		trailing?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<svelte:element
	this={as}
	data-slot="section"
	data-variant={variant}
	class={cn(
		'flex flex-col',
		columnClasses[variant],
		variant === 'ruled' && showRule && 'border-t border-border/60 pt-section',
		className
	)}
	{...restProps}
>
	{#if variant === 'divided' && showRule}
		<Divider spacing="none" class="mb-1" />
	{/if}
	<!-- What each look draws, as the application's (R5-6): `ruled` its title alone, `divided` its title and muted line
	     (never a trailing control), `plain` the whole header — each only when it has a title (`divided`: or a line). -->
	{#if variant === 'ruled' ? title : variant === 'divided' ? title || subtitle : title}
		<SectionHeader
			{title}
			subtitle={variant === 'ruled' ? undefined : subtitle}
			{variant}
			as={headingAs}
			id={titleId}
			trailing={variant === 'plain' ? trailing : undefined}
		/>
	{/if}
	{@render children?.()}
</svelte:element>

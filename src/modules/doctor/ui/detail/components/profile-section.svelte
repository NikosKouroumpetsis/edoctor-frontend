<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { Section } from '$shared/ui/molecules/section';

	let {
		id,
		title,
		children,
		class: className
	}: {
		/** `doctor-<id>` the anchor of the section bar, `doctor-detail-<id>` the application's test id. */
		id: string;
		/** The section's title («Διαθεσιμότητα»); the summary has none (its own line is its title). */
		title?: string;
		children: Snippet;
		class?: string;
	} = $props();
</script>

<!-- One section of the profile, the application's `Section variant="ruled"`: its hairline and 32 above, the title;
     an anchor clear of the phone's top bar and, from 744, of the fixed section bar (80). -->
<Section
	variant="ruled"
	{title}
	titleId={title ? `doctor-${id}-title` : undefined}
	id={`doctor-${id}`}
	aria-labelledby={title ? `doctor-${id}-title` : undefined}
	data-section={id}
	data-testid={`doctor-detail-${id}`}
	class={cn('scroll-mt-bar-top tablet:scroll-mt-section-bar', className)}
>
	{@render children()}
</Section>

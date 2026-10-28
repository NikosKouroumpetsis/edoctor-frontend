<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';

	let {
		label,
		icon,
		testId,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The group's name («Ειδικότητες»), already localized. */
		label: string;
		/** The muted 16 glyph before it; without one the header is the words alone («Προτεινόμενες …»). */
		icon?: IoniconName;
		testId?: string;
	} = $props();
</script>

<!-- The application's group headers of the suggestions (M-36): a glyph + the 14 semibold words, 8 apart, inset 4;
     the «recommended» header is the words alone. Give it an `id` and name a `role="group"` list by it. -->
<div
	data-slot="suggestion-group-header"
	data-testid={testId}
	class={cn(icon && 'flex flex-row items-center gap-2 px-1', className)}
	{...restProps}
>
	{#if icon}
		<Ionicon name={icon} class="icon-sm text-muted-foreground" />
	{/if}
	<span class="text-body-sm font-semibold text-foreground">{label}</span>
</div>

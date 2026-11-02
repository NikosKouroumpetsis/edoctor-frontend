<script lang="ts" module>
	/** `md` (default) the 14 words of the criteria panel; `sm` Airbnb's 12 group words of the search (U-21). */
	export type SuggestionGroupHeaderSize = 'md' | 'sm';
	/** `foreground` (default) or `muted`, Airbnb's grey group words («Ειδικότητες», «Γιατροί», U-21). */
	export type SuggestionGroupHeaderTone = 'foreground' | 'muted';

	const labelSizes: Record<SuggestionGroupHeaderSize, string> = {
		md: 'text-body-sm',
		sm: 'text-label-md'
	};
	const labelTones: Record<SuggestionGroupHeaderTone, string> = {
		foreground: 'text-foreground',
		muted: 'text-muted-foreground'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';

	let {
		label,
		icon,
		size = 'md',
		tone = 'foreground',
		testId,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The group's name («Ειδικότητες»), already localized. */
		label: string;
		/** The muted 16 glyph before it; without one the header is the words alone («Προτεινόμενες …»). */
		icon?: IoniconName;
		size?: SuggestionGroupHeaderSize;
		tone?: SuggestionGroupHeaderTone;
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
	<span class={cn('font-semibold', labelSizes[size], labelTones[tone])}>{label}</span>
</div>

<script lang="ts" module>
	export type SelectOption = {
		label: string;
		/** A second line under the label in the option list. */
		subtitle?: string;
		value: string;
		/** A short lead before the label (a flag): plain text, never markup. */
		leading?: string;
	};

	/** The application's option filter: the trimmed query, case-insensitive, anywhere in the label. */
	export function filterOptions<T extends { label: string }>(options: T[], query: string): T[] {
		const needle = query.trim().toLowerCase();
		return needle
			? options.filter((option) => option.label.toLowerCase().includes(needle))
			: options;
	}
</script>

<script lang="ts">
	import { SelectContent, SelectItem } from '$shared/ui/primitives/select';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		options,
		value,
		searchPlaceholder,
		searchLabel,
		class: className
	}: {
		options: SelectOption[];
		value?: string;
		/** With it the list starts with a search field (the application's `searchable`). */
		searchPlaceholder?: string;
		/** The search field's accessible name (its placeholder when absent). */
		searchLabel?: string;
		class?: string;
	} = $props();

	let query = $state('');
	const shown = $derived(searchPlaceholder ? filterOptions(options, query) : options);

	// Typing stays in the field: only the arrows and Escape reach the list's own keyboard handling.
	function onSearchKeydown(event: KeyboardEvent) {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Escape')
			event.stopPropagation();
	}
</script>

<!-- The picker's list (the application's bottom sheet of `ListItem`s): an optional search field, then one row
     per option — lead, label (primary when chosen) and subtitle — with the check of the chosen one. -->
<SelectContent class={cn('w-popover-md max-w-full p-2', className)}>
	{#if searchPlaceholder}
		<div class="relative mb-1 px-2">
			<Ionicon
				name="search"
				class="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-muted-foreground"
			/>
			<input
				type="search"
				bind:value={query}
				placeholder={searchPlaceholder}
				aria-label={searchLabel ?? searchPlaceholder}
				data-slot="select-search"
				onkeydown={onSearchKeydown}
				class="flex min-h-control-md w-full rounded-md border border-input bg-card pr-3 pl-field-inset text-body-lg text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring"
			/>
		</div>
	{/if}
	{#each shown as option (option.value)}
		{@const chosen = option.value === value}
		<SelectItem value={option.value} label={option.label} class="gap-3 px-4 py-3 pr-indent">
			{#if option.leading}
				<span aria-hidden="true" class="shrink-0 text-body-md">{option.leading}</span>
			{/if}
			<span class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
				<span
					class={cn(
						'truncate text-body-md font-medium',
						chosen ? 'text-primary-text' : 'text-foreground'
					)}
				>
					{option.label}
				</span>
				{#if option.subtitle}
					<span class="line-clamp-2 text-body-sm text-muted-foreground">{option.subtitle}</span>
				{/if}
			</span>
		</SelectItem>
	{/each}
</SelectContent>

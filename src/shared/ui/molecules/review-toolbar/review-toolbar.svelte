<script lang="ts" module>
	/** One order of the list, its words already localized. */
	export type ReviewToolbarOption = { value: string; label: string };
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { BottomSheet, BottomSheetTitle } from '$shared/ui/molecules/bottom-sheet';
	import { Select } from '$shared/ui/molecules/select';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		count,
		sortOptions,
		sortValue,
		onSortChange,
		sortLabel,
		query = $bindable(''),
		searching = $bindable(false),
		searchLabel,
		searchCloseLabel,
		maxLength,
		testId,
		class: className
	}: {
		/** «184 κριτικές». */
		count: string;
		sortOptions: readonly ReviewToolbarOption[];
		sortValue: string;
		onSortChange: (value: string) => void;
		sortLabel: string;
		/** The words in the field (bind them): the caller asks the server, none is kept anywhere. */
		query?: string;
		/** The field is open (bind it). */
		searching?: boolean;
		searchLabel: string;
		searchCloseLabel: string;
		/** U-65.6: the most the field takes. */
		maxLength: number;
		testId?: string;
		class?: string;
	} = $props();

	let field = $state<HTMLInputElement | null>(null);
	let opener = $state<HTMLElement | null>(null);
	let sheetOpen = $state(false);
	const chosen = $derived(sortOptions.find((option) => option.value === sortValue));

	async function openSearch() {
		searching = true;
		await tick();
		field?.focus();
	}
	async function closeSearch() {
		searching = false;
		query = '';
		await tick();
		opener?.focus();
	}
	function pick(value: string) {
		sheetOpen = false;
		onSortChange(value);
	}
	function onSearchKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		// The field takes Escape first: the window under it stays open (the kit's `escapeKeydown`).
		event.preventDefault();
		void closeSearch();
	}
</script>

<!-- U-66.1 Π6: «N κριτικές», the order and the round search on one row; a press grows the field out of the circle over
     the whole row (0,25 s, CSS). The order from 744 is the kit's menu under the pill; below 744 the application's sheet
     (U-81.2). A very long order on a narrow phone sends the two buttons to a second row, never cut. -->
<div
	data-slot="review-toolbar"
	data-testid={testId}
	data-searching={searching || undefined}
	class={cn('relative flex min-h-touch flex-row flex-wrap items-center gap-x-2 gap-y-3', className)}
>
	<p
		aria-live="polite"
		class={cn(
			'flex-1 basis-auto text-body-lg font-semibold whitespace-nowrap text-foreground transition-opacity duration-label ease-standard',
			searching && 'pointer-events-none opacity-0'
		)}
	>
		{count}
	</p>
	<div
		inert={searching}
		class={cn(
			'ml-auto flex flex-row items-center gap-2 transition-opacity duration-label ease-standard tablet:gap-3',
			searching && 'opacity-0'
		)}
	>
		<div class="hidden tablet:block">
			<Select
				variant="pill"
				options={sortOptions.map((option) => ({ label: option.label, value: option.value }))}
				value={sortValue}
				onChange={onSortChange}
				placeholder={sortLabel}
				aria-label={sortLabel}
				data-testid={testId ? `${testId}-sort` : undefined}
			/>
		</div>
		<button
			type="button"
			aria-haspopup="listbox"
			aria-expanded={sheetOpen}
			aria-label={`${sortLabel}: ${chosen?.label ?? ''}`}
			data-testid={testId ? `${testId}-sort-phone` : undefined}
			onclick={() => (sheetOpen = true)}
			class="inline-flex h-control-md min-w-touch flex-row items-center gap-1.5 rounded-full border border-border bg-card pr-3 pl-3.5 text-label-lg font-semibold whitespace-nowrap text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 tablet:hidden"
		>
			<span>{chosen?.label}</span>
			<Ionicon name="chevron-down" class="icon-sm" />
		</button>
		<IconButton
			icon="search"
			appearance="outline"
			size="md"
			iconSize="md"
			aria-label={searchLabel}
			aria-expanded={searching}
			bind:ref={opener}
			data-testid={testId ? `${testId}-search` : undefined}
			onclick={() => void openSearch()}
		/>
	</div>
	<div
		data-slot="review-toolbar-field"
		class={cn(
			'absolute top-0 right-0 flex h-control-md flex-row items-center gap-2 overflow-hidden rounded-full border border-border bg-card pr-1 pl-3.5 transition-[width,opacity] duration-standard ease-standard focus-within:border-foreground',
			searching ? 'w-full opacity-100' : 'pointer-events-none w-control-md opacity-0'
		)}
		inert={!searching}
	>
		<Ionicon name="search" class="icon-sm shrink-0 text-foreground" />
		<input
			bind:this={field}
			bind:value={query}
			type="search"
			maxlength={maxLength}
			placeholder={searchLabel}
			aria-label={searchLabel}
			autocomplete="off"
			enterkeyhint="search"
			data-testid={testId ? `${testId}-input` : undefined}
			onkeydown={onSearchKeydown}
			class="size-full min-h-touch min-w-touch flex-1 bg-transparent text-body-lg text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
		/>
		<IconButton
			icon="close"
			appearance="bare"
			size="sm"
			iconSize="sm"
			aria-label={searchCloseLabel}
			data-testid={testId ? `${testId}-search-close` : undefined}
			onclick={() => void closeSearch()}
		/>
	</div>
</div>

<BottomSheet bind:open={sheetOpen} size="md" aria-label={sortLabel}>
	<div class="px-4 pb-section">
		<BottomSheetTitle class="pt-2 pb-3 text-center text-body-lg font-semibold text-foreground">
			{sortLabel}
		</BottomSheetTitle>
		<div role="listbox" aria-label={sortLabel}>
			{#each sortOptions as option (option.value)}
				<button
					type="button"
					role="option"
					aria-selected={option.value === sortValue}
					data-testid={testId ? `${testId}-sort-option-${option.value}` : undefined}
					onclick={() => pick(option.value)}
					class={cn(
						'flex min-h-control-lg w-full flex-row items-center justify-between gap-2.5 rounded-md px-3 text-left text-body-lg text-foreground transition-colors duration-label ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:bg-muted',
						option.value === sortValue && 'font-semibold'
					)}
				>
					<span>{option.label}</span>
					{#if option.value === sortValue}
						<Ionicon name="checkmark" class="icon-md text-primary-text" />
					{/if}
				</button>
			{/each}
		</div>
	</div>
</BottomSheet>

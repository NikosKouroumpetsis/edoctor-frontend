<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { SelectableCardIconPlacement, SelectableCardSize } from './selectable-card.svelte';

	/** One card: the caller's words, its value and an optional glyph. */
	export type SelectableCardsOption = {
		value: string;
		title: string;
		description?: string;
		icon?: Snippet;
		/**
		 * What opens under the card while it is chosen, 24 in (the application's `details`, record §6.8: «Τι parking
		 * υπάρχει;» under Parking); gone again when it is let go. The caller's own controls, never a card's.
		 */
		details?: Snippet;
	};

	/** A single choice is one value (or none), a multiple one a list (the application's two `onChange`). */
	export type SelectableCardsValue = string | string[] | undefined;

	export type SelectableCardsProps = {
		options: SelectableCardsOption[];
		/** `single` (radio group, the default) or `multiple` (checkboxes). */
		type?: 'single' | 'multiple';
		value?: SelectableCardsValue;
		/** The new choice: the value (single) or the list (multiple), the application's `onChange`. */
		onChange?: (value: SelectableCardsValue) => void;
		disabled?: boolean;
		iconPlacement?: SelectableCardIconPlacement;
		/** U-28.3: `md` (default, the application's cards 12 apart) or `sm` (the smaller cards, 8 apart). */
		size?: SelectableCardSize;
		/** `false`: no card changes under the pointer (U-100, a caller with no hover); the default keeps U-28.4's hover. */
		hover?: boolean;
		/** The question over the cards, also the group's name. */
		label?: string;
		/**
		 * Web only (MINOR-3 of r1; React Native has no `aria-labelledby`): the id of the caller's own heading that names
		 * the group, when the question is drawn there (a section's title) — no second question over the cards.
		 */
		labelledBy?: string;
		/** `<id>` on the group, `<id>-<value>` on each card. */
		testId?: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { handleRovingKeydown, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import SelectableCard from './selectable-card.svelte';

	let {
		options,
		type = 'single',
		value = $bindable(),
		onChange,
		disabled = false,
		iconPlacement = 'trailing',
		size = 'md',
		hover = true,
		label,
		labelledBy,
		testId,
		class: className
	}: SelectableCardsProps = $props();

	const labelId = useId(undefined, 'selectable-cards');
	let group = $state<HTMLElement | null>(null);
	const isMultiple = $derived(type === 'multiple');
	const chosen = $derived(
		isMultiple ? (Array.isArray(value) ? value : []) : typeof value === 'string' ? [value] : []
	);
	// One Tab stop: the first chosen card, else the first card.
	const tabStop = $derived(options.find((option) => chosen.includes(option.value))?.value);

	function toggle(next: string) {
		if (disabled) return;
		if (isMultiple) {
			const updated = chosen.includes(next)
				? chosen.filter((item) => item !== next)
				: [...chosen, next];
			value = updated;
			onChange?.(updated);
			return;
		}
		// Radio-group semantics: choosing sets the value; choosing it again keeps it.
		value = next;
		onChange?.(next);
	}

	// Single: the arrows move the focus AND choose; multiple: they only move (Space toggles). A key pressed on a control
	// of an option's details is that control's own: it moves no card (as `ChipGroup` ignores what is not one of its).
	function onkeydown(event: KeyboardEvent) {
		if (!group) return;
		if (!(event.target instanceof HTMLElement) || !event.target.hasAttribute('data-roving-item'))
			return;
		const moved = handleRovingKeydown(event, group, { orientation: 'vertical' });
		if (!isMultiple && moved?.dataset.value) toggle(moved.dataset.value);
	}
</script>

{#snippet card(option: SelectableCardsOption)}
	<SelectableCard
		role={isMultiple ? 'checkbox' : 'radio'}
		title={option.title}
		description={option.description}
		icon={option.icon}
		{iconPlacement}
		{size}
		{hover}
		selected={chosen.includes(option.value)}
		{disabled}
		data-roving-item
		data-value={option.value}
		tabindex={(tabStop ?? options[0]?.value) === option.value ? 0 : -1}
		testId={testId ? `${testId}-${option.value}` : undefined}
		onclick={() => toggle(option.value)}
	/>
{/snippet}

<!-- The application's `SelectableCards`: the optional question (heading 24), then the cards 12 apart (`sm` 8). A chosen
     option with `details` opens them right under its card, 24 in (the application's `pt-3.5 pl-6`). -->
<div data-slot="selectable-cards" data-testid={testId} class={cn('w-full', className)}>
	{#if label}
		<p id={labelId} class="mb-4 text-heading-md font-semibold text-foreground">{label}</p>
	{/if}
	<div
		bind:this={group}
		role={isMultiple ? 'group' : 'radiogroup'}
		aria-labelledby={label ? labelId : labelledBy}
		class={cn('flex w-full flex-col', size === 'sm' ? 'gap-2' : 'gap-3')}
		{onkeydown}
	>
		{#each options as option (option.value)}
			{#if option.details}
				<div data-slot="selectable-cards-option" class="flex w-full flex-col">
					{@render card(option)}
					{#if chosen.includes(option.value)}
						<div
							data-slot="selectable-cards-details"
							data-testid={testId ? `${testId}-${option.value}-details` : undefined}
							class="pt-3.5 pl-6"
						>
							{@render option.details()}
						</div>
					{/if}
				</div>
			{:else}
				{@render card(option)}
			{/if}
		{/each}
	</div>
</div>

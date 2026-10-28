<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { SelectableCardIconPlacement } from './selectable-card.svelte';

	/** One card: the caller's words, its value and an optional glyph. */
	export type SelectableCardsOption = {
		value: string;
		title: string;
		description?: string;
		icon?: Snippet;
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
		/** The question over the cards, also the group's name. */
		label?: string;
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
		label,
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

	// Single: the arrows move the focus AND choose; multiple: they only move (Space toggles).
	function onkeydown(event: KeyboardEvent) {
		if (!group) return;
		const moved = handleRovingKeydown(event, group, { orientation: 'vertical' });
		if (!isMultiple && moved?.dataset.value) toggle(moved.dataset.value);
	}
</script>

<!-- The application's `SelectableCards`: the optional question (heading 24), then the cards 12 apart. -->
<div data-slot="selectable-cards" data-testid={testId} class={cn('w-full', className)}>
	{#if label}
		<p id={labelId} class="mb-4 text-heading-md font-semibold text-foreground">{label}</p>
	{/if}
	<div
		bind:this={group}
		role={isMultiple ? 'group' : 'radiogroup'}
		aria-labelledby={label ? labelId : undefined}
		class="flex w-full flex-col gap-3"
		{onkeydown}
	>
		{#each options as option (option.value)}
			<SelectableCard
				role={isMultiple ? 'checkbox' : 'radio'}
				title={option.title}
				description={option.description}
				icon={option.icon}
				{iconPlacement}
				selected={chosen.includes(option.value)}
				{disabled}
				data-roving-item
				data-value={option.value}
				tabindex={(tabStop ?? options[0]?.value) === option.value ? 0 : -1}
				testId={testId ? `${testId}-${option.value}` : undefined}
				onclick={() => toggle(option.value)}
			/>
		{/each}
	</div>
</div>

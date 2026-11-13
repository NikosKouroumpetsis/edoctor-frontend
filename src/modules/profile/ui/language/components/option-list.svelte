<script lang="ts" generics="Value extends string">
	import { handleRovingKeydown } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import type { PreferenceOption } from '../types';

	let {
		label,
		value,
		options,
		onChoose,
		testId
	}: {
		/** The group's name: the row's title. */
		label: string;
		/** The one that holds now. */
		value: Value;
		options: PreferenceOption<Value>[];
		/** A press on a choice — the one that holds too (the row closes all the same). */
		onChoose: (value: Value) => void;
		/** Each choice is `<testId>-<value>`. */
		testId: string;
	} = $props();

	let group = $state<HTMLDivElement | null>(null);
	// One Tab stop: the chosen one, else the first.
	const tabStop = $derived(
		options.some((option) => option.value === value) ? value : options[0]?.value
	);

	// The arrows only MOVE between the choices: a choice holds at its press (Enter, Space, a tap) and closes the row, so
	// an arrow must not choose on the way.
	function onkeydown(event: KeyboardEvent) {
		if (group) handleRovingKeydown(event, group, { orientation: 'vertical' });
	}
</script>

<!-- Screen 61's choices (`58-personal/pers.css:17-20` `.f-opts`, `.f-opt`; U-112: one under the other, never tiles): rows
     of the whole width, 52 high, the name 16 and the radio on the right (22: the chosen one dark with its light centre),
     a thin line under each. One Tab stop, the chosen one. No colour under the pointer (U-100). -->
<div
	bind:this={group}
	role="radiogroup"
	aria-label={label}
	tabindex={-1}
	class="flex flex-col"
	{onkeydown}
>
	{#each options as option (option.value)}
		{@const checked = option.value === value}
		<button
			type="button"
			role="radio"
			aria-checked={checked}
			data-roving-item
			data-value={option.value}
			data-testid={`${testId}-${option.value}`}
			tabindex={tabStop === option.value ? 0 : -1}
			class="group flex min-h-reading-row w-full flex-row items-center justify-between gap-3 border-b border-line text-start text-body-lg text-foreground outline-none"
			onclick={() => onChoose(option.value)}
		>
			<span>{option.label}</span>
			<span
				aria-hidden="true"
				class={cn(
					'flex size-5.5 shrink-0 items-center justify-center rounded-full group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
					checked ? 'bg-foreground' : 'border border-input'
				)}
			>
				{#if checked}<span class="size-2 rounded-full bg-card"></span>{/if}
			</span>
		</button>
	{/each}
</div>

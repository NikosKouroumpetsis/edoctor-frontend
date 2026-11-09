<script lang="ts">
	import { handleRovingKeydown } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';

	let {
		title,
		value,
		options,
		onChange
	}: {
		/** «Είναι το πρώτο σας ραντεβού με Dr. …;»: the group's name. */
		title: string;
		value: 'yes' | 'no';
		options: { value: 'yes' | 'no'; label: string }[];
		onChange: (value: 'yes' | 'no') => void;
	} = $props();

	let group = $state<HTMLDivElement | null>(null);
	const headingId = $props.id();

	function onkeydown(event: KeyboardEvent) {
		if (!group) return;
		const moved = handleRovingKeydown(event, group, { orientation: 'vertical' });
		const next = moved?.dataset.value;
		if (next === 'yes' || next === 'no') onChange(next);
	}
</script>

<!-- Ε2 = Α (U-104.3, record §3.2): «Είναι το πρώτο σας ραντεβού…;» 16/600, then «Ναι / Όχι» as rows of the whole width
     (56), the radio on the right, in a frame of the 12 corner below 744 (none from 744, in the panel). The group is named
     by its heading; the arrows move the choice. No colour under the pointer (U-100). -->
<section data-slot="booking-first-visit" class="flex flex-col">
	<h2 id={headingId} class="mb-3 text-body-lg font-semibold text-foreground">{title}</h2>
	<div
		bind:this={group}
		role="radiogroup"
		aria-labelledby={headingId}
		tabindex={-1}
		{onkeydown}
		class="flex flex-col rounded-md border border-border px-4 tablet:rounded-none tablet:border-0 tablet:px-0"
	>
		{#each options as option, index (option.value)}
			{@const checked = value === option.value}
			<button
				type="button"
				role="radio"
				aria-checked={checked}
				data-roving-item
				data-value={option.value}
				tabindex={checked ? 0 : -1}
				class={cn(
					'group flex min-h-row w-full flex-row items-center justify-between gap-3 text-start text-body-sm font-medium text-foreground outline-none',
					index > 0 && 'border-t border-border'
				)}
				onclick={() => onChange(option.value)}
			>
				<span>{option.label}</span>
				<span
					aria-hidden="true"
					class={cn(
						'flex size-6 shrink-0 items-center justify-center rounded-full group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
						checked ? 'border-2 border-foreground' : 'border border-muted-foreground'
					)}
				>
					{#if checked}<span class="size-3 rounded-full bg-foreground"></span>{/if}
				</span>
			</button>
		{/each}
	</div>
</section>

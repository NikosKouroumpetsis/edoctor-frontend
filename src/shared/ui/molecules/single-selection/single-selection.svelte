<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { handleRovingKeydown } from '$shared/lib/headless';
	import type { FieldApi } from '$shared/lib/form';

	let {
		label,
		options,
		value = $bindable(''),
		field,
		error,
		disabled = false,
		class: className
	}: {
		label?: string;
		options: { value: string; label: string }[];
		value?: string;
		field?: FieldApi<string>;
		error?: string;
		disabled?: boolean;
		class?: string;
	} = $props();

	let groupEl = $state<HTMLDivElement | null>(null);
	const current = $derived(field ? (field.value ?? '') : value);
	const currentError = $derived(field ? field.error : error);

	function select(next: string) {
		if (disabled) return;
		if (field) field.setValue(next);
		else value = next;
	}

	function onkeydown(event: KeyboardEvent) {
		const moved = handleRovingKeydown(event, groupEl!, { orientation: 'horizontal' });
		if (moved?.dataset.value) select(moved.dataset.value);
	}
</script>

<div class={cn('w-full', className)} data-slot="single-selection">
	{#if label}<p class="mb-1.5 text-label-lg text-muted-foreground">{label}</p>{/if}
	<div
		bind:this={groupEl}
		role="radiogroup"
		aria-label={label}
		tabindex={-1}
		{onkeydown}
		class="flex flex-wrap gap-2"
	>
		{#each options as option, i (option.value)}
			{@const checked = current === option.value}
			<button
				type="button"
				role="radio"
				aria-checked={checked}
				data-roving-item
				data-value={option.value}
				{disabled}
				tabindex={checked || (!current && i === 0) ? 0 : -1}
				onclick={() => select(option.value)}
				class={cn(
					'rounded-md border-2 bg-card px-4 py-2 text-body-sm whitespace-nowrap transition-[color,border-color,box-shadow] outline-none select-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50',
					checked
						? 'border-foreground text-foreground shadow-md'
						: 'border-input text-muted-foreground hover:text-foreground'
				)}
			>
				{option.label}
			</button>
		{/each}
	</div>
	{#if currentError}<p class="mt-1 text-body-sm text-destructive">{currentError}</p>{/if}
</div>

<script lang="ts">
	import CheckIcon from '~icons/lucide/check';
	import { cn } from '$shared/lib/utils';
	import type { FieldApi } from '$shared/lib/form';

	let {
		label,
		options,
		value = $bindable<string[]>([]),
		field,
		error,
		disabled = false,
		class: className
	}: {
		label?: string;
		options: { value: string; label: string }[];
		value?: string[];
		field?: FieldApi<string[]>;
		error?: string;
		disabled?: boolean;
		class?: string;
	} = $props();

	const current = $derived<string[]>(field ? (field.value ?? []) : value);
	const currentError = $derived(field ? field.error : error);

	function toggle(option: string) {
		if (disabled) return;
		const next = current.includes(option)
			? current.filter((v) => v !== option)
			: [...current, option];
		if (field) field.setValue(next);
		else value = next;
	}
</script>

<div class={cn('w-full', className)} data-slot="multi-selection">
	{#if label}<p class="mb-1.5 text-label-lg text-muted-foreground">{label}</p>{/if}
	<div role="group" aria-label={label} class="flex flex-wrap gap-2">
		{#each options as option (option.value)}
			{@const checked = current.includes(option.value)}
			<button
				type="button"
				role="checkbox"
				aria-checked={checked}
				{disabled}
				onclick={() => toggle(option.value)}
				class={cn(
					'inline-flex items-center gap-1.5 rounded-md border-2 bg-card px-4 py-2 text-body-sm whitespace-nowrap transition-[color,border-color,box-shadow] outline-none select-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50',
					checked
						? 'border-foreground text-foreground shadow-md'
						: 'border-input text-muted-foreground hover:text-foreground'
				)}
			>
				{#if checked}<CheckIcon class="size-3.5" />{/if}
				{option.label}
			</button>
		{/each}
	</div>
	{#if currentError}<p class="mt-1 text-body-sm text-destructive">{currentError}</p>{/if}
</div>

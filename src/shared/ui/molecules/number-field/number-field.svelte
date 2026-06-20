<script lang="ts">
	import ChevronUpIcon from '~icons/lucide/chevron-up';
	import ChevronDownIcon from '~icons/lucide/chevron-down';
	import { TextField, type TextFieldSize } from '$shared/ui/molecules/text-field';
	import type { FieldApi } from '$shared/lib/form';

	let {
		label,
		value = $bindable(''),
		field,
		error,
		name,
		size = 'default',
		placeholder = '',
		min,
		max,
		step = 1,
		disabled = false
	}: {
		label: string;
		value?: string;
		field?: FieldApi<string>;
		error?: string;
		name?: string;
		size?: TextFieldSize;
		placeholder?: string;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
	} = $props();

	const current = $derived(field ? (field.value ?? '') : value);

	function setCurrent(next: string) {
		if (field) field.setValue(next);
		else value = next;
	}

	function nudge(direction: 1 | -1) {
		if (disabled) return;
		const parsed = Number(current);
		let next = (Number.isFinite(parsed) ? parsed : 0) + direction * step;
		if (min != null) next = Math.max(min, next);
		if (max != null) next = Math.min(max, next);
		setCurrent(String(next));
	}
</script>

<TextField
	{label}
	{field}
	bind:value
	{error}
	{name}
	{size}
	{placeholder}
	{disabled}
	type="text"
	inputmode="numeric"
>
	{#snippet trailing()}
		<div class="flex flex-col">
			<button
				type="button"
				aria-label="Increase"
				tabindex={-1}
				{disabled}
				onclick={() => nudge(1)}
				class="flex h-4 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
			>
				<ChevronUpIcon class="size-3.5" />
			</button>
			<button
				type="button"
				aria-label="Decrease"
				tabindex={-1}
				{disabled}
				onclick={() => nudge(-1)}
				class="flex h-4 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
			>
				<ChevronDownIcon class="size-3.5" />
			</button>
		</div>
	{/snippet}
</TextField>

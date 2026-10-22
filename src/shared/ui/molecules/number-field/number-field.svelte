<script lang="ts">
	import ChevronUpIcon from '~icons/lucide/chevron-up';
	import ChevronDownIcon from '~icons/lucide/chevron-down';
	import { TextField, type TextFieldSize } from '$shared/ui/molecules/text-field';
	import { Button } from '$shared/ui/primitives/button';
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

<!-- The steppers sit beside the field as full touch targets (they no longer fit inside its box). -->
<div class="flex w-full items-start gap-touch-gap" data-slot="number-field">
	<TextField
		{label}
		{field}
		bind:value
		{error}
		{name}
		{size}
		{placeholder}
		{disabled}
		class="flex-1"
		type="text"
		inputmode="numeric"
	/>
	<Button
		variant="outline"
		size="icon"
		aria-label="Decrease"
		tabindex={-1}
		{disabled}
		onclick={() => nudge(-1)}
	>
		<ChevronDownIcon />
	</Button>
	<Button
		variant="outline"
		size="icon"
		aria-label="Increase"
		tabindex={-1}
		{disabled}
		onclick={() => nudge(1)}
	>
		<ChevronUpIcon />
	</Button>
</div>

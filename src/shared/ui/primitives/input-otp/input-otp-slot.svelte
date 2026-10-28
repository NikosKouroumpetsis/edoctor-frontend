<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getInputOtpContext, inputOtpSizes } from './input-otp.svelte';

	let {
		ref = $bindable(null),
		index,
		class: className,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { index: number } = $props();

	const ctx = getInputOtpContext();
	const slot = $derived(ctx.getSlot(index));
</script>

<div
	bind:this={ref}
	data-slot="input-otp-slot"
	data-active={slot.isActive ? '' : undefined}
	class={cn(
		'relative flex flex-1 items-center justify-center font-medium transition-colors',
		inputOtpSizes[ctx.size].digit,
		slot.char === undefined ? 'text-muted-foreground' : 'text-foreground',
		className
	)}
	{...restProps}
>
	{#if slot.char !== undefined}
		{slot.char}
	{:else if !slot.hasFakeCaret}
		-
	{/if}
	{#if slot.hasFakeCaret}
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 flex items-center justify-center"
		>
			<div class="h-5 w-px animate-caret-blink bg-foreground"></div>
		</div>
	{/if}
</div>

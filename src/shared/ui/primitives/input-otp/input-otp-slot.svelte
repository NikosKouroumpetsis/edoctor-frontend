<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getInputOtpContext } from './input-otp.svelte';

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
		'relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-base font-medium shadow-raised transition-all',
		'first:rounded-l-md first:border-l last:rounded-r-md',
		slot.isActive && 'z-10 border-ring ring-[0.5px] ring-ring',
		className
	)}
	{...restProps}
>
	{slot.char ?? ''}
	{#if slot.hasFakeCaret}
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 flex items-center justify-center"
		>
			<div class="h-5 w-px animate-caret-blink bg-foreground"></div>
		</div>
	{/if}
</div>

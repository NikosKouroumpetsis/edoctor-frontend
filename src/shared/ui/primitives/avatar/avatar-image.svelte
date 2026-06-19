<script lang="ts">
	import type { HTMLImgAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { getAvatarContext } from './avatar.svelte';

	let {
		ref = $bindable(null),
		class: className,
		src,
		...restProps
	}: WithElementRef<HTMLImgAttributes, HTMLImageElement> = $props();

	const ctx = getAvatarContext();

	function onload() {
		ctx.status = 'loaded';
	}
	function onerror() {
		ctx.status = 'error';
	}
</script>

{#if ctx.status !== 'error'}
	<img
		bind:this={ref}
		data-slot="avatar-image"
		{src}
		{onload}
		{onerror}
		class={cn('aspect-square size-full object-cover', className)}
		{...restProps}
	/>
{/if}

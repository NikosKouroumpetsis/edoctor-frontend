<script lang="ts">
	import type { Component } from 'svelte';
	import GridIcon from '~icons/lucide/layout-grid';
	import StethoscopeIcon from '~icons/lucide/stethoscope';
	import BabyIcon from '~icons/lucide/baby';
	import HeartPulseIcon from '~icons/lucide/heart-pulse';
	import SparklesIcon from '~icons/lucide/sparkles';
	import VideoIcon from '~icons/lucide/video';
	import type { CategoryId } from '$modules/search-doctors/types';

	let {
		categories,
		activeCategory,
		onSelect
	}: {
		categories: { id: CategoryId; label: string }[];
		activeCategory: CategoryId;
		onSelect: (categoryId: CategoryId) => void;
	} = $props();

	const categoryIcons: Record<CategoryId, Component> = {
		all: GridIcon,
		'internal-medicine': StethoscopeIcon,
		pediatrics: BabyIcon,
		cardiology: HeartPulseIcon,
		dermatology: SparklesIcon,
		online: VideoIcon
	};
</script>

<div
	class="-mx-1 flex gap-5 overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
>
	{#each categories as category (category.id)}
		{@const Icon = categoryIcons[category.id]}
		{@const isSelected = category.id === activeCategory}
		<button
			type="button"
			aria-pressed={isSelected}
			onclick={() => onSelect(category.id)}
			class="flex shrink-0 flex-col items-center gap-2 outline-none"
		>
			<span
				class={[
					'grid size-14 place-items-center rounded-full border transition-colors',
					isSelected
						? 'border-primary/20 bg-primary/10 text-primary'
						: 'border-border/70 bg-card text-muted-foreground'
				]}
			>
				<Icon class="icon-xl" />
			</span>
			<span class="flex flex-col items-center gap-1">
				<span class={['text-body-sm', isSelected ? 'text-foreground' : 'text-muted-foreground']}>
					{category.label}
				</span>
				<span
					class={[
						'h-1 rounded-full transition-all',
						isSelected ? 'w-8 bg-foreground' : 'w-0 bg-transparent'
					]}
				></span>
			</span>
		</button>
	{/each}
</div>

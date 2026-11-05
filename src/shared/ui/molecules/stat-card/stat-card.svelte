<script lang="ts" module>
	/** One figure: its number, its words, and the whole phrase a screen reader says. */
	export type StatCardCell = { id: string; value: string; label: string; accessibleLabel?: string };
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { cn } from '$shared/lib/utils';

	let {
		cells,
		label,
		testId,
		class: className
	}: {
		cells: readonly StatCardCell[];
		/** The list's name, the caller's words. */
		label: string;
		testId?: string;
		class?: string;
	} = $props();

	let root = $state<HTMLElement | null>(null);
	let stacked = $state(false);

	/** Whether a word of a cell is wider than its room: the browser never breaks one, it overflows its box. */
	function wordOverflows(element: HTMLElement): boolean {
		return [...element.querySelectorAll<HTMLElement>('[data-stat-card-label]')].some(
			(word) => word.scrollWidth > word.clientWidth
		);
	}

	// S-26.2: by the words, never the screen's width: a new width of the card, new words or a font that arrives try the
	// one row again; the row is measured, and only then it may stack (no flicker, one root).
	$effect(() => {
		const element = root;
		void cells;
		if (!element) return;
		let disposed = false;
		let decidedAt: number | null = null;
		async function decide(again = false) {
			if (!element || (!again && element.clientWidth === decidedAt)) return;
			decidedAt = element.clientWidth;
			stacked = false;
			await tick();
			if (!disposed) stacked = wordOverflows(element);
		}
		const observer =
			typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => void decide());
		const fonts = 'fonts' in document ? document.fonts : undefined;
		const onFonts = () => void decide(true);
		fonts?.addEventListener('loadingdone', onFonts);
		observer?.observe(element);
		void decide();
		return () => {
			disposed = true;
			observer?.disconnect();
			fonts?.removeEventListener('loadingdone', onFonts);
		};
	});
</script>

<!-- 🔴 U-72.3 Π3 (screen 15, Airbnb's host card): a raised card of figures in equal cells between hairlines, each its
     number over its words; when even one word does not fit its cell, they stack with the number beside the words: the
     rule of S-26.2, for every cell. It rises in, CSS only (U-12). -->
<ul
	bind:this={root}
	aria-label={label}
	data-slot="stat-card"
	data-layout={stacked ? 'stack' : 'row'}
	data-testid={testId}
	class={cn(
		'flex rounded-xl border border-border/60 bg-card shadow-raised transition-[translate,opacity] duration-standard ease-standard starting:translate-y-1.5 starting:opacity-0',
		stacked ? 'flex-col px-5 py-1' : 'flex-row items-stretch py-5',
		className
	)}
>
	{#each cells as cell, index (cell.id)}
		<li
			data-testid={testId ? `${testId}-${cell.id}` : undefined}
			class={cn(
				'min-w-0',
				stacked
					? 'flex flex-row items-baseline gap-3 py-3.5 text-left'
					: 'flex flex-1 basis-0 flex-col items-center gap-1 px-2 text-center tablet:px-4',
				index > 0 && (stacked ? 'border-t border-border/60' : 'border-l border-border/60')
			)}
		>
			{#if cell.accessibleLabel}<span class="sr-only">{cell.accessibleLabel}</span>{/if}
			<span
				aria-hidden={cell.accessibleLabel ? 'true' : undefined}
				class={cn(
					'text-heading-md font-bold text-foreground tabular-nums',
					stacked && 'min-w-control-md shrink-0'
				)}>{cell.value}</span
			>
			<span
				data-stat-card-label
				aria-hidden={cell.accessibleLabel ? 'true' : undefined}
				class={cn(
					'max-w-full overflow-hidden font-medium text-muted-foreground',
					stacked ? 'text-body-sm' : 'text-label-md tablet:text-label-lg'
				)}>{cell.label}</span
			>
		</li>
	{/each}
</ul>

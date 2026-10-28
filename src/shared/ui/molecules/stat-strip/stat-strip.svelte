<script lang="ts" module>
	import type { Snippet } from 'svelte';

	/** One cell: its id and what it draws (the application's `render`). */
	export type StatStripCell = { id: string; render: Snippet };
	/**
	 * The cell that takes the rest of the row, and its own line when a word of it does not fit; `text` is its words
	 * (the application counts them; here a change of them decides again, as a new width does).
	 */
	export type StatStripWrap = { id: string; text: string };

	const divider = 'border-l border-border/40';
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		cells,
		wrap,
		testId,
		testIdPrefix,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		cells: readonly StatStripCell[];
		wrap?: StatStripWrap;
		/** `<id>` the strip, `<id>-numbers` the row of the others under the wrap cell on its own line. */
		testId?: string;
		/** `<prefix>-<id>` per cell (the application's test ids). */
		testIdPrefix?: string;
	} = $props();

	let root = $state<HTMLElement | null>(null);
	let ownLine = $state(false);
	const wrapId = $derived(wrap?.id);
	const wrapText = $derived(wrap?.text);
	const wrapCell = $derived(
		wrapId === undefined ? undefined : cells.find((cell) => cell.id === wrapId)
	);
	const others = $derived(cells.filter((cell) => cell !== wrapCell));
	const testIdOf = (id: string) => (testIdPrefix ? `${testIdPrefix}-${id}` : undefined);

	/**
	 * Whether a word of the wrap cell is wider than its room. The browser never breaks a word (the application's text
	 * does, and counts more lines than words): an unbroken word overflows its cell, which is what is measured.
	 */
	function wordOverflows(): boolean {
		const cell = root?.querySelector<HTMLElement>('[data-stat-strip-wrap="true"]');
		return cell ? cell.scrollWidth > cell.clientWidth : false;
	}

	// 🔴 S-26.2: never by the screen's width. A new width of the strip ITSELF (a window, a zoom), new words or a
	// font that arrives try the one row again; while it is the row, any other change of a box (the strip's, the wrap
	// cell's: a larger text, longer numbers) checks the words again, without leaving the row first (no flicker).
	$effect(() => {
		const found = root;
		void wrapText;
		if (!found || wrapId === undefined) return;
		const element: HTMLElement = found;
		// A decision still waiting on a `tick` when the effect is cleaned up stops there (R2 NIT-R2-1).
		let disposed = false;
		let decidedAt: number | null = null;
		let watchedCell: Element | null = null;
		const observer =
			typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => void decide());
		const fonts = 'fonts' in document ? document.fonts : undefined;

		/** The wrap cell is drawn again with each layout: the observer follows the one in the row. */
		function watchWrapCell() {
			const cell = element.querySelector('[data-stat-strip-wrap="true"]');
			if (cell === watchedCell) return;
			if (watchedCell) observer?.unobserve(watchedCell);
			watchedCell = cell;
			if (cell) observer?.observe(cell);
		}

		async function decide(again = false) {
			if (again || element.clientWidth !== decidedAt) {
				decidedAt = element.clientWidth;
				ownLine = false;
				await tick();
				if (disposed) return;
				ownLine = wordOverflows();
			} else if (!ownLine) {
				ownLine = wordOverflows();
			}
			await tick();
			if (disposed) return;
			watchWrapCell();
		}

		const onFontsLoaded = () => void decide(true);
		fonts?.addEventListener('loadingdone', onFontsLoaded);
		void decide();
		observer?.observe(element);
		return () => {
			disposed = true;
			observer?.disconnect();
			fonts?.removeEventListener('loadingdone', onFontsLoaded);
		};
	});
</script>

<!-- The application's strip (M-23): cells between hairlines, the wrap cell taking the rest of the row while the
     others keep their width; ONE root in both layouts, so the measure never starts over by itself. -->
<div
	bind:this={root}
	data-slot="stat-strip"
	data-layout={ownLine && wrapCell ? 'own-line' : 'row'}
	data-testid={testId}
	class={cn(
		'-mx-4 min-h-row-lg py-3',
		ownLine && wrapCell ? 'flex flex-col gap-3' : 'flex flex-row items-stretch',
		className
	)}
	{...restProps}
>
	{#if ownLine && wrapCell}
		<div data-testid={testIdOf(wrapCell.id)} class="flex flex-col items-center justify-center px-4">
			{@render wrapCell.render()}
		</div>
		<div data-testid={testId ? `${testId}-numbers` : undefined} class="flex flex-row items-stretch">
			{#each others as cell, index (cell.id)}
				<div
					data-testid={testIdOf(cell.id)}
					class={cn('flex flex-1 flex-col justify-center px-4', index > 0 && divider)}
				>
					{@render cell.render()}
				</div>
			{/each}
		</div>
	{:else}
		{#each cells as cell, index (cell.id)}
			{@const isWrap = cell === wrapCell}
			<div
				data-testid={testIdOf(cell.id)}
				data-stat-strip-wrap={isWrap ? 'true' : undefined}
				class={cn(
					'flex flex-col justify-center px-4',
					isWrap ? 'min-w-0 flex-1' : 'shrink-0',
					index > 0 && divider
				)}
			>
				{@render cell.render()}
			</div>
		{/each}
	{/if}
</div>

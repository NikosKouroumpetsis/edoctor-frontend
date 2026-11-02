<script lang="ts" module>
	/** `circle` the phone's 40 icon circle (beside the summary pill), `pill` the web's «⚙ Φίλτρα [2]» from 744. */
	export type FilterButtonShape = 'circle' | 'pill';
</script>

<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		shape = 'circle',
		label,
		count = 0,
		'aria-label': ariaLabel,
		onclick,
		disabled = false,
		testId,
		ref = $bindable(null),
		class: className
	}: {
		shape?: FilterButtonShape;
		/** The pill's visible word («Φίλτρα»); the circle shows only its glyph. */
		label: string;
		/** Above 0 the button is active: the 2 dark ring and the count badge (U-24.2, the application's `count`). */
		count?: number;
		/** The whole name, the count already in its words («Φίλτρα, 2 ενεργά φίλτρα»). */
		'aria-label': string;
		/** The press; its `currentTarget` is the button (its rect: the filters zoom out of it). */
		onclick?: (event: MouseEvent & { currentTarget: EventTarget & HTMLElement }) => void;
		disabled?: boolean;
		testId?: string;
		ref?: HTMLElement | null;
		/** Places the button (`hidden tablet:inline-flex`); never sizes it. */
		class?: ClassValue;
	} = $props();

	const isActive = $derived(count > 0);
</script>

<!-- U-24.2 (the wave record §7.3): the filters' one button. No filter ⇒ the 1 hairline of the `border` token (its
     own look, MINOR-6 of r1: not the 60 % of an outlined icon button); with filters ⇒ the 2 dark ring and the dark
     count badge, as the application's `IconButton` `count` (its slots' names kept). The circle is 40 in its 48 box;
     the pill (40 high, in the 48 box) draws the same states around «⚙ Φίλτρα» and its badge inline. The pill's
     active ring is inset (`ring-1` inside the 1 border), so a filter never reflows the row. -->
{#if shape === 'circle'}
	<button
		bind:this={ref}
		type="button"
		{disabled}
		aria-label={ariaLabel}
		data-slot="filter-button"
		data-shape="circle"
		data-state={isActive ? 'active' : 'idle'}
		data-testid={testId}
		class={cn(
			'group relative inline-flex size-touch shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
			className
		)}
		onclick={(event) => onclick?.(event)}
	>
		<!-- U-28.4: with a pointer, the idle circle darkens its hairline on hover, as the pill does. -->
		<span
			data-slot="icon-button-shape"
			class={cn(
				'inline-flex size-control-sm items-center justify-center rounded-full bg-card',
				isActive
					? 'border-2 border-foreground'
					: 'border border-border transition-colors duration-standard ease-standard can-hover:group-enabled:group-hover:border-foreground'
			)}
		>
			<Ionicon name="options-outline" class="icon-md text-foreground" />
		</span>
		{#if isActive}
			<span
				data-slot="icon-button-count"
				class="absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-background bg-foreground px-1 py-px text-label-md font-semibold text-background"
			>
				{count}
			</span>
		{/if}
	</button>
{:else}
	<button
		bind:this={ref}
		type="button"
		{disabled}
		aria-label={ariaLabel}
		data-slot="filter-button"
		data-shape="pill"
		data-state={isActive ? 'active' : 'idle'}
		data-testid={testId}
		class={cn(
			'inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
			className
		)}
		onclick={(event) => onclick?.(event)}
	>
		<span
			data-slot="filter-button-pill"
			class={cn(
				'inline-flex min-h-control-sm flex-row items-center gap-2 rounded-full border bg-card px-4 transition-colors duration-standard ease-standard can-hover:hover:border-foreground',
				isActive ? 'border-foreground ring-1 ring-foreground ring-inset' : 'border-border'
			)}
		>
			<Ionicon name="options-outline" class="icon-sm text-foreground" />
			<span class="text-body-sm font-semibold whitespace-nowrap text-foreground">{label}</span>
			{#if isActive}
				<span
					data-slot="filter-button-count"
					class="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-label-md font-semibold text-background"
				>
					{count}
				</span>
			{/if}
		</span>
	</button>
{/if}

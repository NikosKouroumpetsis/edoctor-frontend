<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** A press (`onclick`, the application's `onPress`) or, on the web, a page it leads to (`href`). */
	type DateCardAction =
		| { onclick: () => void; href?: undefined }
		| { href: string; onclick?: undefined };

	export type DateCardProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'onclick'> &
		DateCardAction & {
			/** The day, formatted by the caller («12 Αυγ», S-32.9). */
			title: string;
			/** The line under it («από 10:00»), formatted by the caller. */
			subtitle: string;
			/** The name; both lines («12 Αυγ, από 10:00») when the caller names nothing. */
			'aria-label'?: string;
			testId?: string;
		};

	/**
	 * 🔴 U-02.2: the application's day card (M-10), class for class; it fills its cell (no width of its own past
	 * `w-full`), so a grid cell decides how wide it is. The focus ring is the web's own state.
	 */
	export const dateCardClasses =
		'flex min-h-control-xl w-full flex-col justify-center rounded-md border border-border/70 px-3 py-2.5 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		title,
		subtitle,
		onclick,
		href,
		'aria-label': ariaLabel,
		testId,
		class: className,
		...restProps
	}: DateCardProps = $props();

	const name = $derived(ariaLabel ?? `${title}, ${subtitle}`);
</script>

{#snippet lines()}
	<span class="flex flex-col gap-0.5">
		<span class="truncate text-body-md font-semibold text-primary-text">{title}</span>
		<span class="truncate text-body-sm text-muted-foreground">{subtitle}</span>
	</span>
{/snippet}

{#if href}
	<a
		{href}
		aria-label={name}
		data-slot="date-card"
		data-testid={testId}
		class={cn(dateCardClasses, className)}
		{...restProps}
	>
		{@render lines()}
	</a>
{:else}
	<button
		type="button"
		aria-label={name}
		data-slot="date-card"
		data-testid={testId}
		{onclick}
		class={cn(dateCardClasses, className)}
		{...restProps}
	>
		{@render lines()}
	</button>
{/if}

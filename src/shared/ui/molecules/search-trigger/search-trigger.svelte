<script lang="ts" module>
	import type { HTMLButtonAttributes } from 'svelte/elements';

	/** The pressed pill's rect, for a modal that zooms out of it (the application's `SearchTriggerLayout`). */
	export type SearchTriggerLayout = { height: number; width: number; x: number; y: number };
	/** From which zone the pill hides (the web pairs it with `SearchBar` from 744); `none` keeps it everywhere. */
	export type SearchTriggerHideFrom = 'tablet' | 'none';

	/**
	 * `card` the application's floating pill (one or two lines); `pill` the web home's phone pill (the wave record
	 * §4.1, the prototype's `.mpill`): 56 high with a hairline rim, the glyph and the 14/600 words in the middle.
	 */
	export type SearchTriggerVariant = 'card' | 'pill';

	const hideFromClasses: Record<SearchTriggerHideFrom, string> = {
		tablet: 'tablet:hidden',
		none: ''
	};

	/** The on-screen rect of a pressed element, as the application measures its pill (`pageX - locationX` …). */
	export function layoutOf(element: Element): SearchTriggerLayout {
		const rect = element.getBoundingClientRect();
		return { height: rect.height, width: rect.width, x: rect.left, y: rect.top };
	}

	export type SearchTriggerProps = Omit<HTMLButtonAttributes, 'children' | 'title'> & {
		/** One line: the search glyph and these words (the home header). */
		placeholder?: string;
		/** Two lines: the bold top line; with it the pill draws the two-line form (the results bar). */
		title?: string;
		/** Two lines: the muted second line. */
		subtitle?: string;
		/** The name read aloud; else the title, else the placeholder (the application's fallback). */
		'aria-label'?: string;
		hideFrom?: SearchTriggerHideFrom;
		/** The look (one line only for `pill`); `card` by default, the application's. */
		variant?: SearchTriggerVariant;
		testId?: string;
		/** The outer column (the application's `gap-3` wrapper); it places the pill, never sizes it. */
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		placeholder,
		title,
		subtitle,
		'aria-label': ariaLabel,
		hideFrom = 'tablet',
		variant = 'card',
		testId,
		onclick,
		class: className,
		...restProps
	}: SearchTriggerProps = $props();

	const isTwoLine = $derived(title !== undefined && variant === 'card');
	const isPill = $derived(variant === 'pill');
</script>

<!-- The application's `SearchTrigger`: a floating card pill, no border; one line (glyph + words) or two (title over
     a muted line), each cut to one line. Without an action it is inert, as the application's `disabled={!onPress}`. -->
<div
	data-slot="search-trigger"
	class={cn('flex flex-col gap-3', hideFromClasses[hideFrom], className)}
>
	<button
		type="button"
		data-slot="search-trigger-pill"
		data-testid={testId}
		aria-label={ariaLabel ?? title ?? placeholder}
		disabled={!onclick}
		{onclick}
		class={cn(
			'min-h-touch w-full rounded-full bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
			isPill
				? 'min-h-control-lg border border-foreground/6 px-5 shadow-overlay'
				: cn('shadow-floating', isTwoLine ? 'px-5 py-3' : 'px-5 py-5'),
			// U-28.4, with a pointer: the home's pill lifts on hover (Airbnb's search pill), the card pill takes the light fill.
			isPill
				? 'transition-shadow duration-standard ease-standard can-hover:enabled:hover:shadow-floating'
				: 'transition-colors duration-standard ease-standard can-hover:enabled:hover:bg-muted'
		)}
		{...restProps}
	>
		{#if isTwoLine}
			<span class="flex flex-col items-center">
				<span class="line-clamp-1 text-body-md font-semibold text-foreground">{title}</span>
				{#if subtitle}
					<span class="line-clamp-1 text-body-sm text-muted-foreground">{subtitle}</span>
				{/if}
			</span>
		{:else if isPill}
			<span
				data-slot="search-trigger-words"
				class="flex flex-row items-center justify-center gap-2.5"
			>
				<Ionicon name="search" class="icon-md text-foreground" />
				<span class="line-clamp-1 text-body-sm font-semibold text-foreground">{placeholder}</span>
			</span>
		{:else}
			<span class="flex flex-row items-center justify-center gap-3">
				<Ionicon name="search" class="icon-md text-muted-foreground" />
				<span class="text-body-lg leading-relaxed font-semibold text-foreground/80"
					>{placeholder}</span
				>
			</span>
		{/if}
	</button>
</div>

<script lang="ts" module>
	/** The zone from which the bar shows (`tablet`: none on the phone, U-16.3), or `none` for every width. */
	export type AppHeaderShowFrom = 'tablet' | 'none';

	const showFromClasses: Record<AppHeaderShowFrom, string> = {
		tablet: 'hidden tablet:block',
		none: ''
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';

	let {
		brand,
		nav,
		compact,
		compactOn = false,
		actions,
		showFrom = 'none',
		class: className
	}: {
		/** The home link with the mark (left). */
		brand: Snippet;
		/** The primary navigation, in the middle. */
		nav?: Snippet;
		/** What takes the navigation's place while `compactOn` (a page's search pill, Airbnb's). */
		compact?: Snippet;
		compactOn?: boolean;
		/** The controls at the right end (the menu). */
		actions?: Snippet;
		showFrom?: AppHeaderShowFrom;
		class?: string;
	} = $props();

	// The hairline under the bar shows once the page has scrolled (apple.com's, U-16.8). Read in the browser only.
	let scrolled = $state(false);
	$effect(() => {
		const update = () => (scrolled = window.scrollY > 0);
		update();
		window.addEventListener('scroll', update, { passive: true });
		return () => window.removeEventListener('scroll', update);
	});
</script>

<!-- apple.com's top bar (U-16.8, U-17.3): 64 high, the frosted white at 80 % (`saturate(180%) blur(20px)`), its
     content in the middle (the 1024 box, 22 a side: 980), a hairline only once the page scrolls. The navigation
     fades out for the `compact` part (0.25 s on Airbnb's curve), which grows in from 92 % in its place. -->
<header
	data-slot="app-header"
	data-scrolled={scrolled}
	class={cn(
		'sticky top-0 z-50 h-bar-top border-b border-transparent bg-card/80 backdrop-blur-bar backdrop-saturate-180 transition-[border-color] duration-standard ease-standard data-[scrolled=true]:border-border',
		showFromClasses[showFrom],
		className
	)}
>
	<div
		class="relative mx-auto flex h-full max-w-bar-content flex-row items-center justify-between gap-4 px-5.5"
	>
		{@render brand()}
		{#if nav}
			<div
				data-slot="app-header-nav"
				data-state={compactOn ? 'closed' : 'open'}
				inert={compact ? compactOn : false}
				class={cn(
					'flex min-w-0 flex-1 flex-row items-center justify-center transition-opacity duration-standard ease-standard',
					compact && compactOn && 'pointer-events-none opacity-0'
				)}
			>
				{@render nav()}
			</div>
		{/if}
		{#if compact}
			<div
				data-slot="app-header-compact"
				data-state={compactOn ? 'open' : 'closed'}
				inert={!compactOn}
				class="absolute top-2 left-1/2 -translate-x-1/2 transition-[opacity,scale] duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:scale-92 data-[state=closed]:opacity-0"
			>
				{@render compact()}
			</div>
		{/if}
		{#if actions}
			<div class="flex shrink-0 flex-row items-center gap-2">
				{@render actions()}
			</div>
		{/if}
	</div>
</header>

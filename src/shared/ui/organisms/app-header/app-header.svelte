<script lang="ts" module>
	/** The zone from which the bar shows (`tablet`: none on the phone, U-16.3), or `none` for every width. */
	export type AppHeaderShowFrom = 'tablet' | 'none';

	const showFromClasses: Record<AppHeaderShowFrom, string> = {
		tablet: 'hidden tablet:block',
		none: ''
	};

	/**
	 * The box the bar's content stands in (🔴 U-215.3, D-W52-12). `box`: apple.com's 1024 in the middle, 22 a side (the
	 * default, every bar until wave 5.2). `page`: always the page's own frame — from 744 as wide as the page (1920 at
	 * most, centred beyond it), 24 from its edges and 48 from 1128, where the navigation stands in the exact middle.
	 * `split-page`: that frame from 950 only on a page that stands on a `SplitView` (the `split-page:` variant, CSS
	 * alone), so the mark is right over the side column; on every other page the `box`.
	 */
	export type AppHeaderFrame = 'box' | 'page' | 'split-page';

	const frameClasses: Record<AppHeaderFrame, string> = {
		box: '',
		page: 'tablet:max-w-wide tablet:px-6 laptop:px-pane-inset',
		'split-page':
			'split:split-page:max-w-wide split:split-page:px-6 laptop:split-page:px-pane-inset'
	};
	/** The navigation of a `page` frame from 1128: out of the row, in the middle of the frame (as `compact` is). */
	const navClasses: Record<AppHeaderFrame, string> = {
		box: '',
		page: 'laptop:absolute laptop:inset-y-0 laptop:left-1/2 laptop:flex-none laptop:-translate-x-1/2',
		'split-page': ''
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
		frame = 'box',
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
		/** The box of the bar's content: the 1024 (`box`), the page's frame always (`page`) or beside a side column (`split-page`). */
		frame?: AppHeaderFrame;
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
     fades out for the `compact` part (0.25 s on Airbnb's curve), which grows in from 92 % in its place. With `frame`
     the content takes the page's own frame instead (U-215.3: one frame for the bar and the page). -->
<header
	data-slot="app-header"
	data-frame={frame}
	data-scrolled={scrolled}
	class={cn(
		'sticky top-0 z-50 h-bar-top border-b border-transparent bg-card/80 backdrop-blur-bar backdrop-saturate-180 transition-[border-color] duration-standard ease-standard data-[scrolled=true]:border-border',
		showFromClasses[showFrom],
		className
	)}
>
	<div
		data-slot="app-header-content"
		class={cn(
			'relative mx-auto flex h-full max-w-bar-content flex-row items-center justify-between gap-4 px-5.5',
			frameClasses[frame]
		)}
	>
		{@render brand()}
		{#if nav}
			<div
				data-slot="app-header-nav"
				data-state={compactOn ? 'closed' : 'open'}
				inert={compact ? compactOn : false}
				class={cn(
					'flex min-w-0 flex-1 flex-row items-center justify-center transition-opacity duration-standard ease-standard',
					navClasses[frame],
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

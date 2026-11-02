<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	export type BottomNavHideFrom = 'tablet' | 'split' | 'laptop' | 'desktop';

	export type BottomNavItem = {
		key: string;
		label: string;
		/** The glyph at rest; `activeIcon` when it is the current tab (the application's outline ⇄ filled). */
		icon: IoniconName;
		activeIcon?: IoniconName;
		/** A link; without one the tab is a button the caller wires with `onclick`. */
		href?: string;
		onclick?: () => void;
		current?: boolean;
	};

	/** Where the bar hides, in full class names (Tailwind reads no built strings). */
	export const bottomNavHideClasses: Record<BottomNavHideFrom, string> = {
		tablet: 'tablet:hidden',
		split: 'split:hidden',
		laptop: 'laptop:hidden',
		desktop: 'desktop:hidden'
	};

	/** The room a page end keeps for the bar while it shows (`pb-bar-bottom`), per hiding zone. */
	export const bottomNavReserveClasses: Record<BottomNavHideFrom, string> = {
		tablet: 'pb-bar-bottom tablet:pb-0',
		split: 'pb-bar-bottom split:pb-0',
		laptop: 'pb-bar-bottom laptop:pb-0',
		desktop: 'pb-bar-bottom desktop:pb-0'
	};

	// Each tab is a 48 target filling its third of the capsule; the current one sits in the bubble (the 7 % ink,
	// flower-application's) in the primary text colour, the others in the text colour (U-16.10, U-17.1).
	const tabClass =
		'flex min-h-touch min-w-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		items,
		'aria-label': ariaLabel,
		hideFrom = 'tablet'
	}: {
		items: BottomNavItem[];
		/** The navigation landmark's name, already localized. */
		'aria-label': string;
		/** The zone from which the capsule hides (744: the top bar takes over there, U-16.3). */
		hideFrom?: BottomNavHideFrom;
	} = $props();
</script>

<!-- flower-application's floating glass capsule (U-16.10, U-17.1, U-18.1): 280 wide in the middle, 16 above the
     lower edge and the safe area, 4 inside, fully round, the page showing through the white at 50 %
     (`blur(7px) saturate(180%)`) under a 65 % white rim; always shown while its zone lasts. -->
<nav
	data-slot="bottom-nav"
	aria-label={ariaLabel}
	class={cn(
		'fixed bottom-safe-area left-1/2 z-40 w-tab-capsule-w max-w-full -translate-x-1/2 rounded-full border border-card/65 bg-card/50 p-1 shadow-overlay backdrop-blur-glass backdrop-saturate-180',
		bottomNavHideClasses[hideFrom]
	)}
>
	<!-- U-28.4: with a pointer, a tab not current takes a lighter bubble on hover. -->
	<ul class="flex flex-row items-stretch">
		{#each items as item (item.key)}
			{@const glyph = item.current && item.activeIcon ? item.activeIcon : item.icon}
			{@const look = item.current
				? 'bg-foreground/7 text-primary-text'
				: 'text-foreground can-hover:hover:bg-foreground/4'}
			<li class="flex flex-1">
				{#if item.href}
					<a
						href={item.href}
						aria-current={item.current ? 'page' : undefined}
						data-slot="bottom-nav-tab"
						data-state={item.current ? 'on' : 'off'}
						class={cn(tabClass, look)}
					>
						<Ionicon name={glyph} class="icon-lg" />
						<span class="text-label-md font-semibold">{item.label}</span>
					</a>
				{:else}
					<button
						type="button"
						onclick={() => item.onclick?.()}
						data-slot="bottom-nav-tab"
						data-state={item.current ? 'on' : 'off'}
						class={cn(tabClass, look)}
					>
						<Ionicon name={glyph} class="icon-lg" />
						<span class="text-label-md font-semibold">{item.label}</span>
					</button>
				{/if}
			</li>
		{/each}
	</ul>
</nav>

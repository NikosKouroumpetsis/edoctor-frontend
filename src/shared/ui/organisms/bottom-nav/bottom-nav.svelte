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

	// Each tab is a 48 target: the application's tab bar — the current tab in `primary`, the others muted.
	const tabClass =
		'flex min-h-touch min-w-touch flex-col items-center justify-center gap-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		items,
		'aria-label': ariaLabel,
		hideFrom = 'laptop'
	}: {
		items: BottomNavItem[];
		/** The navigation landmark's name, already localized. */
		'aria-label': string;
		/** The zone from which the bar hides (the 1128 of today until the home page is discussed, U-03.8). */
		hideFrom?: BottomNavHideFrom;
	} = $props();
</script>

<nav
	data-slot="bottom-nav"
	aria-label={ariaLabel}
	class={cn(
		'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card',
		bottomNavHideClasses[hideFrom]
	)}
>
	<ul class="mx-auto flex max-w-content items-stretch justify-around px-2 pt-2 pb-safe-area">
		{#each items as item (item.key)}
			{@const glyph = item.current && item.activeIcon ? item.activeIcon : item.icon}
			<li>
				{#if item.href}
					<a
						href={item.href}
						aria-current={item.current ? 'page' : undefined}
						class={cn(tabClass, item.current ? 'text-primary' : 'text-muted-foreground')}
					>
						<Ionicon name={glyph} class="icon-lg" />
						<span class="text-label-md">{item.label}</span>
					</a>
				{:else}
					<button
						type="button"
						onclick={() => item.onclick?.()}
						class={cn(tabClass, item.current ? 'text-primary' : 'text-muted-foreground')}
					>
						<Ionicon name={glyph} class="icon-lg" />
						<span class="text-label-md">{item.label}</span>
					</button>
				{/if}
			</li>
		{/each}
	</ul>
</nav>

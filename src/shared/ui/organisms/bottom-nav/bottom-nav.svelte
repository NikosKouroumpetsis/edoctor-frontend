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
		/** A small count on the glyph (U-84 Π5: «2», «9+»), as the application's tab; `badgeLabel` is what it says aloud. */
		badge?: string;
		badgeLabel?: string;
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

	// Each tab is a 48 target filling its share of the capsule; the current one sits in the bubble (the 7 % ink,
	// flower-application's) in the primary text colour, the others in the text colour (U-16.10, U-17.1).
	const tabClass =
		'flex min-h-touch min-w-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
	// The tab's word: 12/600, closed up below 360 (D-W4-53).
	const labelClass = 'text-label-md font-semibold whitespace-nowrap narrow-phone:tracking-tight';

	// 🔴 D-W4-65 · D-W4-73 (live checks w4-live-web Δ2, w4-live-web-2 Γ): FIVE tabs are PACKED at every width of the
	// capsule's zone — each tab as wide as its own word (never under the 48 target) and the room left shared out as EQUAL
	// gaps between them, never under 4: five equal shares of the whole 384 are 74,8 and «Εξερευνήστε» is 77,1 at 12, so
	// the words stood 3,4 apart at 400 / 402. The words are written at 11 (`tab-label`, the prototype's) only in a capsule
	// narrower than its 384 (a screen under 400: 320, 360, 375, 393), at 12 from it. Fewer than five would keep their
	// equal shares at 12 — nobody today: the site's bar is ALWAYS five, the same for a guest and a member (D-W4-79), so
	// this is every page of the phone's site, not only the appointments'.
	const PACKED_TABS = 5;
	const packedRow = 'justify-between gap-1 px-0.5 capsule-narrow:px-0';
	const packedLabel = 'capsule-narrow:text-tab-label';
	// U-157 (bug #7, measured `w4-measure-web` §1): the bubble was exactly its word, so the word stood out of the round
	// ends. A packed tab spreads OUT of its own box by the air it gains (negative margin, equal padding), so no word and no
	// gap moves: 6 a side from 400 (the row gives 2 a side there, for the two ends), 4 under 400, none under 360.
	const packedItem = 'flex-none min-w-touch';
	const packedTab =
		'-mx-1.5 px-1.5 capsule-narrow:-mx-1 capsule-narrow:px-1 capsule-narrow:narrow-phone:mx-0 capsule-narrow:narrow-phone:px-0';
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

	const packed = $derived(items.length >= PACKED_TABS);
	const label = $derived(cn(labelClass, packed && packedLabel));
</script>

{#snippet tabGlyph(item: BottomNavItem, glyph: IoniconName)}
	<span class="relative flex">
		<Ionicon name={glyph} class="icon-lg" />
		{#if item.badge}
			<span
				aria-hidden="true"
				data-slot="bottom-nav-badge"
				class="absolute -top-1 left-4 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-danger px-1 text-label-md font-semibold text-danger-foreground ring-2 ring-card"
				>{item.badge}</span
			>
			{#if item.badgeLabel}<span class="sr-only">{item.badgeLabel}</span>{/if}
		{/if}
	</span>
{/snippet}

<!-- flower-application's floating glass capsule (U-16.10, U-17.1, U-18.1): 384 wide (U-134.6, D-W4-53: five tabs) in the
     middle and never closer than 8 to the screen's sides, 16 above the lower edge and the safe area, 4 inside, fully
     round, the page showing through the white at 50 % (`blur(7px) saturate(180%)`) under a 65 % white rim; always shown
     while its zone lasts. Below 360 the words close up (D-W4-53: `tracking-tight`, the prototype's −0.02em); five tabs
     are packed with equal gaps at every width (D-W4-65, D-W4-73). -->
<nav
	data-slot="bottom-nav"
	aria-label={ariaLabel}
	class={cn(
		'fixed bottom-safe-area left-1/2 z-40 w-tab-capsule-w max-w-tab-capsule -translate-x-1/2 rounded-full border border-card/65 bg-card/50 p-1 shadow-overlay backdrop-blur-glass backdrop-saturate-180',
		bottomNavHideClasses[hideFrom]
	)}
>
	<!-- U-28.4: with a pointer, a tab not current takes a lighter bubble on hover. -->
	<ul class={cn('flex flex-row items-stretch', packed && packedRow)}>
		{#each items as item (item.key)}
			{@const glyph = item.current && item.activeIcon ? item.activeIcon : item.icon}
			{@const look = item.current
				? 'bg-foreground/7 text-primary-text'
				: 'text-foreground can-hover:hover:bg-foreground/4'}
			<li class={cn('flex', packed ? packedItem : 'flex-1')}>
				{#if item.href}
					<a
						href={item.href}
						aria-current={item.current ? 'page' : undefined}
						data-slot="bottom-nav-tab"
						data-state={item.current ? 'on' : 'off'}
						class={cn(tabClass, packed && packedTab, look)}
					>
						{@render tabGlyph(item, glyph)}
						<span class={label}>{item.label}</span>
					</a>
				{:else}
					<button
						type="button"
						onclick={() => item.onclick?.()}
						data-slot="bottom-nav-tab"
						data-state={item.current ? 'on' : 'off'}
						class={cn(tabClass, packed && packedTab, look)}
					>
						{@render tabGlyph(item, glyph)}
						<span class={label}>{item.label}</span>
					</button>
				{/if}
			</li>
		{/each}
	</ul>
</nav>

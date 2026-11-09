<script lang="ts" module>
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	export type ChipSize = 'sm' | 'md';
	/** `outline` the results' filters (U-24.3, the prototype): the chosen pill dark-ringed 2 on the band, no fill. */
	export type ChipVariant = 'filled' | 'tinted' | 'outline';

	// The drawn pill per variant: its idle and its active look (the ring is inset, so a choice never reflows the row).
	// U-28.4 (Airbnb's): with a pointer, a chip not chosen darkens its border on hover; a chosen or disabled one does not
	// (`idleHover`, a link's `linkHover`). `hover={false}` (U-100: a caller with no hover) leaves both out.
	const pillLooks: Record<ChipVariant, { idle: string; active: string }> = {
		filled: {
			idle: 'border-border bg-card transition-colors duration-standard ease-standard',
			active: 'border-primary bg-primary'
		},
		tinted: {
			idle: 'border-border bg-card transition-colors duration-standard ease-standard',
			active: 'border-primary bg-primary/10'
		},
		outline: {
			idle: 'border-border bg-card transition-colors duration-standard ease-standard',
			active: 'border-foreground bg-background ring-1 ring-foreground ring-inset'
		}
	};
	// The active words and glyph per variant (the idle ones are always the foreground).
	const activeTextClasses: Record<ChipVariant, string> = {
		filled: 'text-primary-foreground',
		tinted: 'text-primary-text',
		outline: 'text-foreground'
	};
	const activeIconClasses: Record<ChipVariant, string> = {
		filled: 'text-primary',
		tinted: 'text-primary',
		outline: 'text-foreground'
	};
	// 🔴 U-58.1 (`phoneVariant`): the chosen look per width zone, written whole for the theme's scanner — below 744 one
	// variant (the application's outline on the mobile web), from 744 another (the web's tint). The idle look is one.
	type ZonedLook = { pill: string; text: string; icon: string };
	const phoneActive: Record<ChipVariant, ZonedLook> = {
		filled: {
			pill: 'max-tablet:border-primary max-tablet:bg-primary',
			text: 'max-tablet:text-primary-foreground',
			icon: 'max-tablet:text-primary'
		},
		tinted: {
			pill: 'max-tablet:border-primary max-tablet:bg-primary/10',
			text: 'max-tablet:text-primary-text',
			icon: 'max-tablet:text-primary'
		},
		outline: {
			pill: 'max-tablet:border-foreground max-tablet:bg-background max-tablet:ring-1 max-tablet:ring-foreground max-tablet:ring-inset',
			text: 'max-tablet:text-foreground',
			icon: 'max-tablet:text-foreground'
		}
	};
	const tabletActive: Record<ChipVariant, ZonedLook> = {
		filled: {
			pill: 'tablet:border-primary tablet:bg-primary',
			text: 'tablet:text-primary-foreground',
			icon: 'tablet:text-primary'
		},
		tinted: {
			pill: 'tablet:border-primary tablet:bg-primary/10',
			text: 'tablet:text-primary-text',
			icon: 'tablet:text-primary'
		},
		outline: {
			pill: 'tablet:border-foreground tablet:bg-background tablet:ring-1 tablet:ring-foreground tablet:ring-inset',
			text: 'tablet:text-foreground',
			icon: 'tablet:text-foreground'
		}
	};

	// The button is the 48 touch box; the drawn pill (32 or 40) sits inside it and grows with its label.
	const chipBox =
		'group inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center self-start rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

	const pillSizes: Record<ChipSize, string> = {
		sm: 'min-h-control-xs px-3',
		md: 'min-h-control-sm px-4'
	};
	const labelSizes: Record<ChipSize, string> = {
		sm: 'text-label-md',
		md: 'text-label-lg'
	};

	export type ChipProps = Omit<HTMLButtonAttributes, 'children'> & {
		label: string;
		/** A leading Ionicons glyph, as the other shared components take icons. */
		icon?: IoniconName;
		/** A count after the label (a filter's number of results). */
		count?: string | null;
		selected?: boolean;
		/** A trailing ✕ that marks the chip active; pressing the chip then calls `onRemove`. */
		removable?: boolean;
		onRemove?: () => void;
		/** `filled` solid primary when active, `tinted` the primary tint, `outline` the 2 dark ring (U-24.3). */
		variant?: ChipVariant;
		/** Below 744 the chosen look of another variant (U-58.1: the application's outline); `variant` from 744. */
		phoneVariant?: ChipVariant;
		size?: ChipSize;
		/** Classes of the label: a text role only, never a colour. */
		textClass?: string;
		/**
		 * Web only (U-57.2, U-60.1): the chip is a link (`<a href>`, before JavaScript too) — a filter kept in the
		 * address (`?type=`), a jump to an anchor. `selected` is then `aria-current`; no group, no ✕.
		 */
		href?: string;
		/** U-28.4 (`true`, the default): a chip not chosen darkens under the pointer; `false` (U-100, D-W3-27) never. */
		hover?: boolean;
		ref?: HTMLButtonElement | null;
	};

	const idleHover = 'can-hover:group-enabled:group-hover:border-foreground';
	// A link is never `:enabled`: its hover darkens the border without that state (U-28.4).
	const linkHover = 'can-hover:group-hover:border-foreground';
</script>

<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { getChipGroupContext } from './context';

	let {
		label,
		icon,
		count,
		selected = false,
		removable = false,
		onRemove,
		variant = 'filled',
		phoneVariant,
		size = 'md',
		textClass,
		disabled = false,
		type = 'button',
		class: className,
		onclick,
		href,
		hover = true,
		ref = $bindable(null),
		...restProps
	}: ChipProps = $props();

	const group = getChipGroupContext();
	const chipId = useId(undefined, 'chip');
	const isRadio = $derived(group?.type === 'single' && !removable);
	// One choice: only the Tab stop of the group is in the Tab order; the arrows reach the others.
	const tabIndex = $derived(isRadio ? (group?.tabStop === chipId ? 0 : -1) : undefined);

	// 🔴 Registered while the chip is created, not on mount: the server render (and so the page before hydration)
	// already has one Tab stop — the first radio, or the chosen one when it comes first — corrected on hydration.
	const unregister = untrack(() =>
		group?.register(chipId, () => ({ selected, eligible: isRadio && !disabled }))
	);
	onDestroy(() => unregister?.());
	const active = $derived(selected || removable);
	const activeText = $derived(
		phoneVariant
			? cn(phoneActive[phoneVariant].text, tabletActive[variant].text)
			: activeTextClasses[variant]
	);
	const activePill = $derived(
		phoneVariant
			? cn(phoneActive[phoneVariant].pill, tabletActive[variant].pill)
			: pillLooks[variant].active
	);
	const activeIcon = $derived(
		phoneVariant
			? cn(phoneActive[phoneVariant].icon, tabletActive[variant].icon)
			: activeIconClasses[variant]
	);
	// The outline's count stays muted when chosen (the prototype's `.fchip small`), the fills' take the label's colour.
	const countTone = $derived(
		active && variant !== 'outline' ? activeText : 'text-muted-foreground'
	);

	function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		if (removable && onRemove) onRemove();
		else onclick?.(event);
	}
</script>

{#snippet pill()}
	<span
		data-slot="chip-pill"
		class={cn(
			'inline-flex flex-row items-center justify-center gap-1.5 rounded-full border',
			active ? activePill : pillLooks[variant].idle,
			!active && hover && idleHover,
			!active && hover && href && linkHover,
			pillSizes[size]
		)}
	>
		{#if icon}
			<Ionicon name={icon} class={cn('icon-sm', active ? activeIcon : 'text-foreground')} />
		{/if}
		{#snippet labelText()}
			<span
				class={cn(
					'truncate font-medium',
					labelSizes[size],
					active ? activeText : 'text-foreground',
					textClass
				)}
			>
				{label}
			</span>
		{/snippet}
		{#if count}
			<!-- NIT-3 (r1): the smaller count sits on the label's baseline (never raised like an exponent). On a narrow
			     chip only the label gives way (`truncate`); the count never shrinks nor is clipped (final round). -->
			<span
				data-slot="chip-label-count"
				class="inline-flex min-w-0 flex-row items-baseline gap-1.5"
			>
				{@render labelText()}
				<span
					data-slot="chip-count"
					class={cn('shrink-0 text-label-md whitespace-nowrap', countTone)}>{count}</span
				>
			</span>
		{:else}
			{@render labelText()}
		{/if}
		{#if removable}
			<span class="ml-0.5 inline-flex">
				<Ionicon name="close" class="icon-sm text-primary" />
			</span>
		{/if}
	</span>
{/snippet}

{#if href}
	<a
		{href}
		aria-current={selected ? 'page' : undefined}
		data-slot="chip"
		data-state={selected ? 'on' : 'off'}
		class={cn(chipBox, className)}
		{...restProps as Record<string, unknown>}
	>
		{@render pill()}
	</a>
{:else}
	<button
		bind:this={ref}
		{type}
		{disabled}
		role={isRadio ? 'radio' : undefined}
		aria-checked={isRadio ? selected : undefined}
		aria-pressed={!isRadio && !removable ? selected : undefined}
		data-slot="chip"
		data-state={active ? 'on' : 'off'}
		data-roving-item={isRadio ? '' : undefined}
		tabindex={tabIndex}
		class={cn(chipBox, className)}
		onclick={handleClick}
		{...restProps}
	>
		{@render pill()}
	</button>
{/if}

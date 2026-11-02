<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { IoniconName } from '$shared/ui/icons/ionicon';
	import type { HighlightTextMatch } from '$shared/ui/primitives/highlight-text';

	/**
	 * `md` the result / criteria row, `lg` one step up (the communication-language rows), `xl` Airbnb's search row
	 * (U-21/U-23): the 56 tile (corner 12), the 15 name in its regular weight over one 14 muted line, 16 apart.
	 */
	export type OptionRowSize = 'md' | 'lg' | 'xl';
	/**
	 * `button` (default) and `radio` as the application's; web only `option`: a row of a list a field drives with
	 * `aria-activedescendant` (the combobox of `SearchField`), so it takes no focus of its own.
	 */
	export type OptionRowRole = 'button' | 'radio' | 'option';
	// The application's prop name (`accessibilityRole`): it picks the row's element and role, never a raw `role`.
	/** The tile's colour: `neutral` (default) or `primary`, the glyph blue on a blue tile («Κοντά μου», U-21). */
	export type OptionRowTileTone = 'neutral' | 'primary';

	// One class per axis and size, so `md` and `lg` never emit two text sizes (the application's note).
	// After the row's base (`min-h-row rounded-md`): `xl` takes the 72 row and the 16 corner over them.
	const rowSizes: Record<OptionRowSize, string> = {
		md: 'gap-2.5 px-2',
		lg: 'gap-3 px-3',
		xl: 'min-h-row-lg gap-4 rounded-lg px-4'
	};
	const labelSizes: Record<OptionRowSize, string> = {
		md: 'text-body-sm',
		lg: 'text-body-md',
		xl: 'text-body-md'
	};
	// The label's weight when the caller names none: semibold, but the Airbnb row's name is regular.
	const labelWeights: Record<OptionRowSize, string> = {
		md: 'font-semibold',
		lg: 'font-semibold',
		xl: ''
	};
	// The muted line: one line of 12, or Airbnb's 14 that takes two lines before «…» (a long «Π.Ε., Περιφέρεια»).
	const supportingSizes: Record<OptionRowSize, string> = {
		md: 'line-clamp-1 text-label-md',
		lg: 'line-clamp-1 text-label-md',
		xl: 'line-clamp-2 text-body-sm'
	};
	const tileSizes: Record<OptionRowSize, string> = {
		md: 'size-control-sm',
		lg: 'size-control-sm',
		xl: 'size-tile'
	};
	const tileTones: Record<OptionRowTileTone, { tile: string; icon: string }> = {
		neutral: { tile: 'bg-foreground/5', icon: 'text-foreground' },
		primary: { tile: 'bg-primary/10', icon: 'text-primary' }
	};

	export type OptionRowProps = {
		accessibilityRole?: OptionRowRole;
		label: string;
		isSelected: boolean;
		/** A permanent 1px outline, light, dark when selected (the filters' language rows). */
		bordered?: boolean;
		/** The count in the caller's words («12»). */
		count?: string;
		/** Dimmed and refused (unless it is the busy row). */
		disabled?: boolean;
		/** The glyph in the leading tile; ignored when `leading` is given. */
		icon?: IoniconName;
		/** A spinner instead of the glyph, presses refused (a location being resolved). */
		isBusy?: boolean;
		/** Replaces the label's default `font-semibold` (the results pass `font-medium`). */
		labelClass?: string;
		/** Custom leading content instead of the tile; `null` draws none (the application's `leadingContent`). */
		leading?: Snippet | null;
		onclick?: () => void;
		/** Bolds the part of the label that matches (case and Greek-accent insensitive). */
		query?: string;
		/** Where the query counts (`HighlightText`): anywhere (default) or only at the start of a word. */
		queryMatch?: HighlightTextMatch;
		size?: OptionRowSize;
		/** The tile's colour (`neutral` by default); a selected row's tile is the card, the glyph primary. */
		tileTone?: OptionRowTileTone;
		supportingLabel?: string;
		testId?: string;
		/** The id `aria-activedescendant` points at (`option` rows). */
		id?: string;
		/** The row the keyboard reached in its list (`option` rows): `aria-selected`, drawn with the focus ring. */
		active?: boolean;
		class?: string;
	};
</script>

<script lang="ts">
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { HighlightText } from '$shared/ui/primitives/highlight-text';
	import { Spinner } from '$shared/ui/primitives/spinner';

	let {
		accessibilityRole = 'button',
		label,
		isSelected,
		bordered = false,
		count,
		disabled = false,
		icon,
		isBusy = false,
		labelClass,
		leading,
		onclick,
		query,
		queryMatch = 'anywhere',
		size = 'md',
		tileTone = 'neutral',
		supportingLabel,
		testId,
		id,
		active = false,
		class: className
	}: OptionRowProps = $props();

	const blocked = $derived(disabled || isBusy);
	// The name is the label alone, as the application's `accessibilityLabel`; the muted line and the count are read
	// after it as the description, so two rows of the same name still tell apart (review R1 of dyad 4, risk α).
	const uid = useId(undefined, 'option-row');
	const describedBy = $derived(
		[supportingLabel && `${uid}-supporting`, count && `${uid}-count`].filter(Boolean).join(' ') ||
			undefined
	);
	const labelClasses = $derived(
		labelClass
			? cn(labelSizes[size], 'text-foreground', labelClass)
			: cn(labelSizes[size], labelWeights[size], 'text-foreground')
	);
	const rowClass = $derived(
		cn(
			'flex min-h-row w-full flex-row items-center rounded-md py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
			rowSizes[size],
			isSelected ? 'bg-primary/10' : 'bg-transparent',
			bordered && cn('border', isSelected ? 'border-foreground' : 'border-border/60'),
			// U-28.4 (Airbnb's rows): with a pointer, a row not chosen takes the light fill on hover — a bordered one darkens
			// its border instead; a busy or disabled row stays.
			!isSelected &&
				!blocked &&
				cn(
					'transition-colors duration-standard ease-standard',
					bordered ? 'can-hover:hover:border-foreground' : 'can-hover:hover:bg-foreground/5'
				),
			// Only a plain disabled row dims; the busy one keeps its spinner readable.
			disabled && !isBusy && 'opacity-40',
			'data-[active]:ring-3 data-[active]:ring-ring/50 data-[active]:ring-inset',
			className
		)
	);

	function press() {
		if (!blocked) onclick?.();
	}
</script>

{#snippet body()}
	{#if leading !== undefined}
		{@render leading?.()}
	{:else}
		<span
			data-slot="option-row-tile"
			data-tone={tileTone}
			class={cn(
				'flex shrink-0 items-center justify-center rounded-md',
				tileSizes[size],
				isSelected ? 'bg-card' : tileTones[tileTone].tile
			)}
		>
			{#if isBusy}
				<Spinner tone="primary" data-testid={testId ? `${testId}-busy` : undefined} />
			{:else if icon}
				<Ionicon
					name={icon}
					class={cn('icon-lg', isSelected ? 'text-primary' : tileTones[tileTone].icon)}
				/>
			{/if}
		</span>
	{/if}
	<span class="flex min-w-0 flex-1 flex-col">
		{#if query}
			<HighlightText text={label} {query} match={queryMatch} lines={1} class={labelClasses} />
		{:else}
			<span class={cn('line-clamp-1', labelClasses)}>{label}</span>
		{/if}
		{#if supportingLabel}
			<span id={`${uid}-supporting`} class={cn('text-muted-foreground', supportingSizes[size])}
				>{supportingLabel}</span
			>
		{/if}
	</span>
	{#if count}
		<span id={`${uid}-count`} class="shrink-0 text-label-md text-muted-foreground">{count}</span>
	{/if}
	{#if isSelected}
		<Ionicon name="checkmark" class="icon-md shrink-0 text-primary" />
	{/if}
{/snippet}

<!-- The application's `OptionRow` (M-36): the 40 tile with its glyph, the label (+ the muted line), the count and
     the check of the chosen row on the primary tint. -->
{#if accessibilityRole === 'option'}
	<div
		{id}
		role="option"
		aria-label={label}
		aria-describedby={describedBy}
		aria-selected={active}
		aria-checked={isSelected}
		aria-disabled={blocked || undefined}
		aria-busy={isBusy || undefined}
		data-slot="option-row"
		data-active={active ? '' : undefined}
		data-testid={testId}
		tabindex="-1"
		class={rowClass}
		onmousedown={(event) => event.preventDefault()}
		onclick={press}
		onkeydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				press();
			}
		}}
	>
		{@render body()}
	</div>
{:else if accessibilityRole === 'radio'}
	<button
		{id}
		type="button"
		role="radio"
		aria-label={label}
		aria-describedby={describedBy}
		aria-checked={isSelected}
		aria-busy={isBusy || undefined}
		data-slot="option-row"
		data-testid={testId}
		disabled={blocked}
		class={rowClass}
		onclick={press}
	>
		{@render body()}
	</button>
{:else}
	<button
		{id}
		type="button"
		aria-label={label}
		aria-describedby={describedBy}
		aria-pressed={isSelected}
		aria-busy={isBusy || undefined}
		data-slot="option-row"
		data-testid={testId}
		disabled={blocked}
		class={rowClass}
		onclick={press}
	>
		{@render body()}
	</button>
{/if}

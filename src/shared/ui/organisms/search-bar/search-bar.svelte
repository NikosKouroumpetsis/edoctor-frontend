<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * A segment typed in the bar while it is open (U-05.6, Airbnb's «Where»): the field shows `query`, its panel
	 * lists the suggestions as the field's listbox — the arrows walk `optionIds` (`aria-activedescendant`), Enter
	 * commits the row they reached, the focus stays in the field.
	 */
	export type SearchBarSegmentSearch = {
		query: string;
		onQueryChange: (query: string) => void;
		/** The ids of the panel's `option` rows, in their order. */
		optionIds: readonly string[];
		/** Enter on the row the keyboard reached (the same as pressing it). */
		onCommit: (id: string) => void;
		/** The «×» that empties the field, shown with words; none without a name. */
		clearLabel?: string;
	};

	/** One segment of the bar: its label, what is chosen (or the placeholder in muted), its id. */
	export type SearchBarSegment = {
		id: string;
		label: string;
		value?: string;
		placeholder: string;
		/** Typed in the bar while open; without it the open segment stays a button (Airbnb's «When»). */
		search?: SearchBarSegmentSearch;
	};

	/** What the panel of a typed segment wraps its rows in: `role="listbox"` with this id, the active row. */
	export type SearchBarPanelContext = { listboxId: string; activeId: string | undefined };

	export type SearchBarProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		segments: SearchBarSegment[];
		/** The open segment (its panel shows under the bar), or none. */
		active?: string | null;
		onActiveChange?: (id: string | null) => void;
		/** The search button's name; its words too while a panel is open (Airbnb's grown button). */
		submitLabel: string;
		onSubmit: () => void;
		/** The panel's name (`SearchPanel` title) and its «×» name. */
		panelTitle: string;
		closeLabel: string;
		/** The open segment's panel content; without it the bar opens no panel. */
		panel?: Snippet<[string, SearchBarPanelContext]>;
		/** Places and sizes the dropdown (`tablet:w-popover-lg`); the bar's full width by default. */
		panelClass?: string;
		/**
		 * `<id>`, `<id>-<segment>` per segment (its button, or the island of a typed one), `<id>-<segment>-input`,
		 * `<id>-<segment>-clear`, `<id>-submit`, `<id>-panel`.
		 */
		testId?: string;
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { handleListboxKeydown, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { SearchPanel } from '$shared/ui/organisms/search-panel';

	let {
		segments,
		active = $bindable(null),
		onActiveChange,
		submitLabel,
		onSubmit,
		panelTitle,
		closeLabel,
		panel,
		panelClass,
		testId,
		class: className,
		...restProps
	}: SearchBarProps = $props();

	const uid = useId(undefined, 'search-bar');
	const listboxId = `${uid}-listbox`;
	let root = $state<HTMLElement | null>(null);
	let row = $state<HTMLElement | null>(null);
	const idOf = (part: string) => (testId ? `${testId}-${part}` : undefined);

	// The row the keyboard reached, kept per segment: another segment or a list without it shows none.
	let reached = $state<{ segment: string; id: string } | undefined>();
	const openSearch = $derived(segments.find((segment) => segment.id === active)?.search);
	const activeOptionId = $derived(
		reached && reached.segment === active && openSearch?.optionIds.includes(reached.id)
			? reached.id
			: undefined
	);

	function open(id: string | null) {
		if (active === id) return;
		active = id;
		onActiveChange?.(id);
	}

	/** The control of a segment the focus belongs on: its field while it is typed and open, else its button. */
	function controlOf(id: string): HTMLElement | null {
		const controls = root?.querySelectorAll<HTMLElement>('[data-search-bar-control]') ?? [];
		return [...controls].find((control) => control.dataset.searchBarControl === id) ?? null;
	}

	// The keyboard's focus follows the open segment (review R1 of dyad 4, MINOR-3): a typed segment's button turns
	// into its field, the panel's step (Airbnb's «Πού ⇒ Πότε») and its close take away the element that held the
	// focus. Read before the DOM changes; the move waits a microtask (`keepArrowFocus`), and never pulls the focus
	// back from where the user took it (a press outside the bar). A pressed segment asks for it too: Safari does
	// not focus a pressed button, and Airbnb puts the caret in the field it opens.
	let lastActive: string | null = null;
	let pressed: string | null = null;
	$effect.pre(() => {
		const next = active;
		const previous = lastActive;
		const asked = pressed !== null && pressed === next;
		lastActive = next;
		pressed = null;
		const bar = root;
		if (next === previous || !bar || typeof document === 'undefined') return;
		if (!asked && !bar.contains(document.activeElement)) return;
		const target = next ?? previous;
		if (!target) return;
		queueMicrotask(() => {
			const focused = document.activeElement;
			if (focused && focused !== document.body && !bar.contains(focused)) return;
			controlOf(target)?.focus({ preventScroll: true });
		});
	});

	// U-12.3: ONE white pill (one node for the whole bar) under the open segment, measured from that segment's box
	// in the row (its own place, never the screen's width), again when the row's box or the open segment's own box
	// changes (a long value, a font that arrives). It moves as a whole — place, width and height — from segment to
	// segment, either way, 0.25 s on Airbnb's curve; opening the bar it fades in on its segment and closing it fades
	// out where it is (no slide from the corner). `pill` keeps the last box after a close, so the fade out stays put.
	let pill = $state<{ x: number; y: number; width: number; height: number } | null>(null);
	// Measured for the bar's current opening (cleared on a close): until then the pill stays out of sight.
	let measured = $state(false);
	// The first place and the fade in are committed: from now on a new box glides (a CSS change of place in the same
	// frame as the fade in would slide it in from its former box).
	let gliding = $state(false);
	let pillNode = $state<HTMLElement | null>(null);
	const pillShown = $derived(Boolean(active) && measured);
	$effect(() => {
		const id = active;
		const bar = row;
		if (!bar || !id) {
			measured = false;
			return;
		}
		const segmentOf = () =>
			[...bar.querySelectorAll<HTMLElement>('[data-segment-id]')].find(
				(element) => element.dataset.segmentId === id
			);
		const measure = () => {
			const segment = segmentOf();
			if (!segment) return;
			pill = {
				x: segment.offsetLeft,
				y: segment.offsetTop,
				width: segment.offsetWidth,
				height: segment.offsetHeight
			};
			measured = true;
		};
		measure();
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		observer?.observe(bar);
		const open = segmentOf();
		if (open) observer?.observe(open);
		return () => observer?.disconnect();
	});

	$effect(() => {
		if (!pillShown) {
			gliding = false;
			return;
		}
		if (gliding) return;
		// After the DOM has the pill's new place (`tick`): reading its box commits that place with the fade alone.
		let cancelled = false;
		void tick().then(() => {
			if (cancelled) return;
			void pillNode?.offsetWidth;
			gliding = true;
		});
		return () => {
			cancelled = true;
		};
	});

	// The panel keeps the segment it showed while it fades out (the bar's `active` is already none).
	let panelSegment = $state<string | null>(null);
	$effect.pre(() => {
		if (active) panelSegment = active;
	});

	// The row the keyboard reached stays in view inside the panel's scroll.
	$effect(() => {
		if (!activeOptionId || typeof document === 'undefined') return;
		document.getElementById(activeOptionId)?.scrollIntoView?.({ block: 'nearest' });
	});

	function type(search: SearchBarSegmentSearch, words: string) {
		reached = undefined;
		search.onQueryChange(words);
	}

	function keydown(segment: string, search: SearchBarSegmentSearch, event: KeyboardEvent) {
		if (event.defaultPrevented) return;
		const id = handleListboxKeydown(event, search.optionIds, activeOptionId, search.onCommit);
		reached = id ? { segment, id } : undefined;
	}

	function clear(segment: string, search: SearchBarSegmentSearch) {
		type(search, '');
		controlOf(segment)?.focus();
	}

	// `relative`: each segment paints over the one pill that slides under them.
	const segmentClass =
		'relative flex min-h-search-pill min-w-touch flex-1 rounded-full px-6 split:min-h-search-bar-h';
	// WebKit draws its own clear on a search input; the segment's clear is its own button.
	const noNativeClear = '[&::-webkit-search-cancel-button]:appearance-none';
</script>

<!-- Web only (U-05.4): Airbnb's search bar from 744 — the segments in one pill, the open one a card «island» on the
     muted bar (ONE island that moves as a whole from segment to segment, 0.25 s on Airbnb's curve, U-12.3), its panel under
     the bar (`SearchPanel`), the search button growing its words while a panel is open.
     A typed segment («Τι», «Πού») turns into its field in the island (U-05.6). Below 744 the page shows
     `SearchTrigger` instead. From 950 Airbnb's 850 × 66 (U-05.5). -->
<div
	bind:this={root}
	data-slot="search-bar"
	data-testid={testId}
	class={cn('relative mx-auto hidden w-full tablet:block split:max-w-search-bar-w', className)}
	{...restProps}
>
	<div
		bind:this={row}
		data-slot="search-bar-row"
		data-state={active ? 'open' : 'closed'}
		class={cn(
			'relative flex min-h-search-pill w-full flex-row items-center rounded-full border border-border shadow-floating split:min-h-search-bar-h',
			active ? 'bg-muted' : 'bg-card'
		)}
	>
		<span
			bind:this={pillNode}
			aria-hidden="true"
			data-slot="search-bar-pill"
			data-state={pillShown ? 'open' : 'closed'}
			style={pill
				? `width: ${pill.width}px; height: ${pill.height}px; transform: translate(${pill.x}px, ${pill.y}px)`
				: undefined}
			class={cn(
				'pointer-events-none absolute top-0 left-0 rounded-full bg-card shadow-floating duration-standard ease-standard data-[state=closed]:opacity-0',
				gliding ? 'transition-[transform,width,height,opacity]' : 'transition-opacity'
			)}
		></span>
		{#each segments as segment, index (segment.id)}
			{@const isOpen = active === segment.id}
			{#if index > 0}
				<span
					aria-hidden="true"
					data-slot="search-bar-divider"
					class={cn(
						'h-control-xs w-px shrink-0 bg-border',
						(isOpen || active === segments[index - 1].id) && 'invisible'
					)}
				></span>
			{/if}
			{#if isOpen && segment.search && panel}
				{@const search = segment.search}
				{@const labelId = `${uid}-${index}-label`}
				<div
					data-slot="search-bar-segment"
					data-segment-id={segment.id}
					data-state="open"
					data-testid={idOf(segment.id)}
					class={cn(
						segmentClass,
						'flex-row items-center gap-2',
						search.clearLabel && search.query && 'pr-2'
					)}
				>
					<!-- The whole island is the field's label: a press anywhere in it puts the caret in the field. -->
					<label class="flex min-w-0 flex-1 cursor-text flex-col justify-center">
						<span id={labelId} class="text-label-md font-semibold text-foreground"
							>{segment.label}</span
						>
						<input
							type="search"
							role="combobox"
							aria-labelledby={labelId}
							aria-controls={listboxId}
							aria-expanded={search.optionIds.length > 0}
							aria-autocomplete="list"
							aria-activedescendant={activeOptionId}
							autocomplete="off"
							autocapitalize="none"
							spellcheck="false"
							enterkeyhint="search"
							value={search.query}
							placeholder={segment.placeholder}
							data-search-bar-control={segment.id}
							data-slot="search-bar-input"
							data-testid={idOf(`${segment.id}-input`)}
							oninput={(event) => type(search, event.currentTarget.value)}
							onkeydown={(event) => keydown(segment.id, search, event)}
							class={cn(
								'-my-3 min-h-touch w-full bg-transparent text-body-lg text-foreground outline-none placeholder:text-muted-foreground',
								noNativeClear
							)}
						/>
					</label>
					{#if search.clearLabel && search.query}
						<IconButton
							icon="close"
							appearance="tint"
							size="xs"
							surface="muted"
							iconSize="md"
							aria-label={search.clearLabel}
							data-testid={idOf(`${segment.id}-clear`)}
							onclick={() => clear(segment.id, search)}
						/>
					{/if}
				</div>
			{:else}
				<button
					type="button"
					aria-haspopup={panel ? 'dialog' : undefined}
					aria-expanded={panel ? isOpen : undefined}
					data-search-bar-control={segment.id}
					data-slot="search-bar-segment"
					data-segment-id={segment.id}
					data-state={isOpen ? 'open' : 'closed'}
					data-testid={idOf(segment.id)}
					onclick={() => {
						pressed = segment.id;
						open(segment.id);
					}}
					class={cn(
						segmentClass,
						'flex-col justify-center text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
						!isOpen && 'hover:bg-foreground/5'
					)}
				>
					<span class="text-label-md font-semibold text-foreground">{segment.label}</span>
					<span
						class={cn(
							'line-clamp-1 text-body-sm',
							segment.value ? 'text-foreground' : 'text-muted-foreground'
						)}>{segment.value || segment.placeholder}</span
					>
				</button>
			{/if}
		{/each}
		<button
			type="button"
			aria-label={submitLabel}
			data-slot="search-bar-submit"
			data-testid={idOf('submit')}
			onclick={() => onSubmit()}
			data-state={active ? 'open' : 'closed'}
			class={cn(
				'mx-2 inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-full bg-accent text-secondary-foreground transition-[padding] duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
				active ? 'px-4' : 'px-3.5'
			)}
		>
			<Ionicon name="search" class="icon-md" />
			<!-- U-13.2: the words open and close with the button, one grid column 0fr ⇔ 1fr (their width) on 250 ms, so the
			     button grows (Airbnb's curve) and shrinks (an ease-in, after the words); closed, the 14 sides centre the
			     lens in the 48 circle, so it never jumps. The words fade in on an ease-in (seen once their room is there,
			     never cut) and out first, on an ease-out. -->
			<span
				aria-hidden="true"
				data-slot="search-bar-submit-label"
				class={cn(
					'grid transition-[grid-template-columns] duration-standard',
					active ? 'grid-cols-[1fr] ease-standard' : 'grid-cols-[0fr] ease-zoom-out'
				)}
			>
				<span class="min-w-0 overflow-hidden">
					<span
						data-slot="search-bar-submit-words"
						class={cn(
							'block pl-2 text-body-md font-semibold whitespace-nowrap transition-opacity',
							active
								? 'opacity-100 duration-standard ease-zoom-out'
								: 'opacity-0 duration-segment ease-zoom-in'
						)}>{submitLabel}</span
					>
				</span>
			</span>
		</button>
	</div>

	{#if panel}
		<SearchPanel
			open={Boolean(active)}
			title={panelTitle}
			{closeLabel}
			anchor={row}
			testId={idOf('panel')}
			onClose={() => open(null)}
			class={panelClass}
		>
			{#if panelSegment}
				{@render panel(panelSegment, { listboxId, activeId: activeOptionId })}
			{/if}
		</SearchPanel>
	{/if}
</div>

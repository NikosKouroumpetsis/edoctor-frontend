<script lang="ts" module>
	/** One pill: the caller's words and its value. */
	export type PillTab = { label: string; value: string };

	/**
	 * 🔴 U-02.2: the application's pill (M-11), class for class: a 1px border in both states so the row never shifts,
	 * never narrower than its words (S-26.2). The inset ring is the web's focus (the row scrolls, an outer one clips).
	 */
	const pillClasses =
		'flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-full border px-4 py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50';

	/**
	 * The two looks of a row (U-129: each screen its own prototype, through a variant): `outline` the application's pill
	 * (the chosen one dark-ringed); `solid` Airbnb's «Σήμερα · Επερχόμενα» (screen 66, `sw.css:96-98`): the chip's fill,
	 * the chosen one filled dark with its words light and a soft shadow, 15/600 both — no colour under the pointer (U-100).
	 */
	export type PillTabsVariant = 'outline' | 'solid';

	// The solid row's own box: the prototype's 20 inside, the fill's change drawn (U-12).
	const solidPillClasses = 'px-5 transition-colors duration-standard ease-standard';

	const variantClasses: Record<PillTabsVariant, { idle: string; chosen: string }> = {
		outline: {
			idle: 'border-border transition-colors duration-standard ease-standard can-hover:hover:border-foreground',
			chosen: 'border-foreground'
		},
		solid: {
			idle: 'border-transparent bg-chip',
			chosen: 'border-foreground bg-foreground shadow-floating'
		}
	};

	const labelClasses: Record<PillTabsVariant, { idle: string; chosen: string }> = {
		outline: {
			idle: 'text-body-sm text-foreground',
			chosen: 'text-body-sm text-foreground font-semibold'
		},
		solid: {
			idle: 'text-body-md font-semibold text-foreground',
			chosen: 'text-body-md font-semibold text-card'
		}
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { handleRovingKeydown, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';

	let {
		tabs,
		value = $bindable(),
		variant = 'outline',
		onChange,
		heading,
		headingTestId,
		testId,
		testIdPrefix,
		'aria-label': ariaLabel,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		tabs: readonly PillTab[];
		value?: string;
		/** The row's look (`outline` by default). */
		variant?: PillTabsVariant;
		/** The chosen pill (the application's `onChange`). */
		onChange?: (value: string) => void;
		/** A question above the pills, already localized; it names the row. */
		heading?: string;
		headingTestId?: string;
		testId?: string;
		/** `<prefix>-<value>` per pill (the application's test ids). */
		testIdPrefix?: string;
		/** The row's name when there is no `heading`, already localized. */
		'aria-label'?: string;
	} = $props();

	const headingId = useId(undefined, 'pill-tabs');
	let list = $state<HTMLElement | null>(null);
	// The Tab stop: the chosen pill, else the first.
	const tabStop = $derived(tabs.find((tab) => tab.value === value)?.value ?? tabs[0]?.value);

	function choose(next: string) {
		value = next;
		onChange?.(next);
	}

	// Automatic activation, as the kit's `Tabs`: the arrows move the focus and choose the pill they reach.
	function onkeydown(event: KeyboardEvent) {
		if (!list) return;
		const moved = handleRovingKeydown(event, list, { orientation: 'horizontal' });
		if (moved?.dataset.value !== undefined) choose(moved.dataset.value);
	}
</script>

{#if tabs.length > 0}
	<div
		data-slot="pill-tabs"
		data-testid={testId}
		class={cn('flex flex-col gap-3', className)}
		{...restProps}
	>
		{#if heading}
			<p
				id={headingId}
				data-testid={headingTestId}
				class="text-body-md font-semibold text-foreground"
			>
				{heading}
			</p>
		{/if}
		<!-- Live check w51-s2: a scrolling box clips the chosen solid pill's shadow into a square; the solid row (two pills,
		     never wider than its line) does not scroll, so its shadow keeps the pill's round shape. -->
		<div
			data-slot="pill-tabs-scroller"
			class={variant === 'solid'
				? 'overflow-visible'
				: 'scrollbar-none overflow-x-auto overscroll-x-contain'}
		>
			<!-- The focus is on the tabs (one Tab stop, the arrows move it), never on the list itself (APG tabs). -->
			<!-- svelte-ignore a11y_interactive_supports_focus -->
			<div
				bind:this={list}
				role="tablist"
				aria-orientation="horizontal"
				aria-labelledby={heading ? headingId : undefined}
				aria-label={heading ? undefined : ariaLabel}
				data-slot="pill-tabs-list"
				class="flex flex-row gap-2"
				{onkeydown}
			>
				{#each tabs as tab (tab.value)}
					{@const selected = tab.value === value}
					<button
						type="button"
						role="tab"
						aria-selected={selected}
						tabindex={tab.value === tabStop ? 0 : -1}
						data-roving-item
						data-value={tab.value}
						data-testid={testIdPrefix ? `${testIdPrefix}-${tab.value}` : undefined}
						onclick={() => choose(tab.value)}
						data-variant={variant}
						class={cn(
							pillClasses,
							variant === 'solid' && solidPillClasses,
							// U-28.4: with a pointer, an outlined pill not chosen darkens its border on hover (Airbnb's).
							selected ? variantClasses[variant].chosen : variantClasses[variant].idle
						)}
					>
						<span class={selected ? labelClasses[variant].chosen : labelClasses[variant].idle}
							>{tab.label}</span
						>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

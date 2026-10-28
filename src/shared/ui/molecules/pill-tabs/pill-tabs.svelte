<script lang="ts" module>
	/** One pill: the caller's words and its value. */
	export type PillTab = { label: string; value: string };

	/**
	 * 🔴 U-02.2: the application's pill (M-11), class for class: a 1px border in both states so the row never shifts,
	 * never narrower than its words (S-26.2). The inset ring is the web's focus (the row scrolls, an outer one clips).
	 */
	const pillClasses =
		'flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-full border px-4 py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50';
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { handleRovingKeydown, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';

	let {
		tabs,
		value = $bindable(),
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
		<div data-slot="pill-tabs-scroller" class="scrollbar-none overflow-x-auto overscroll-x-contain">
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
						class={cn(pillClasses, selected ? 'border-foreground' : 'border-border')}
					>
						<span class={cn('text-body-sm text-foreground', selected && 'font-semibold')}
							>{tab.label}</span
						>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

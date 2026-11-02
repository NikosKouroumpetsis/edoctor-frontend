<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { AccordionItemVariant } from './accordion-item.svelte';

	/** The summary's tag: a heading of the page's outline (an FAQ's question is an `h3`), or plain words. */
	export type AccordionDetailsSummaryTag = 'h2' | 'h3' | 'h4' | 'span';

	export type AccordionDetailsProps = {
		/** The words of the row that opens it (the question). */
		summary: string;
		summaryAs?: AccordionDetailsSummaryTag;
		/** The summary's text role (the kit's 16/500 by default; an FAQ's question is 17/600, `text-title-xs`). */
		summaryClass?: string;
		/** A muted line over the summary (a search result's category). */
		eyebrow?: string;
		/** The folded words of a search (`searchWords`): their places in the summary bold (a search result). */
		highlight?: readonly string[];
		/** Open on the first render (the server's page too). */
		open?: boolean;
		/** One open at a time among the items of the same name (the native `<details name>`). */
		name?: string;
		/** The chevron that turns over as it opens (on by default here: a disclosure shows it can open). */
		showChevron?: boolean;
		variant?: AccordionItemVariant;
		id?: string;
		class?: string;
		testId?: string;
		/** Called as it starts to open (`true`) or to close (`false`) by a press. */
		onToggle?: (open: boolean) => void;
		/** The answer: in the page's markup from the server on, shown when open. */
		children: Snippet;
	};

	/**
	 * NIT-r2-3: whether the server's `<details>` of this item (`data-accordion-details`) is open in the page right now —
	 * opened by the reader before the script ran; `fallback` when there is none (a mount in the browser, the server).
	 */
	export function openInPage(uid: string, fallback: boolean): boolean {
		if (typeof document === 'undefined') return fallback;
		const node = document.querySelector(`[data-accordion-details="${uid}"]`);
		return node instanceof HTMLDetailsElement ? node.open : fallback;
	}
</script>

<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { isMoving, leaveTimeout } from '$shared/lib/headless';
	import { highlightSearch } from '$shared/lib/text';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { accordionItemVariants } from './accordion-item.svelte';

	let {
		summary,
		summaryAs = 'span',
		summaryClass,
		eyebrow,
		highlight = [],
		open: initiallyOpen = false,
		name,
		showChevron = true,
		variant = 'default',
		id,
		class: className,
		testId,
		onToggle,
		children
	}: AccordionDetailsProps = $props();

	// 🔴 Found by its spec (MINOR-5 of r1): a plain `open={…}` is written again by EVERY update of the template (the
	// motion's), closing what a press, an anchor or find-in-page had just opened. Bound instead, `open` follows the
	// element (its `toggle`) and is written only when it changes; the first render's value is in the server's page.
	// NIT-r2-3: on hydration the binding writes this value into the server's element — the element's own state then,
	// so a question the reader opened before the script ran stays open (the id is the same on both sides).
	const uid = $props.id();
	let isOpen = $state(untrack(() => openInPage(uid, initiallyOpen)));
	let details = $state<HTMLDetailsElement | null>(null);
	let content = $state<HTMLDivElement | null>(null);
	// `null` until the browser runs this file: the native `<details>` alone opens and closes then (no JavaScript, the
	// server's page). After it, the kit's motion: the row 0fr ⇔ 1fr with the opacity on 220 ms (`accordion`, U-12).
	let motion = $state<'open' | 'closed' | null>(null);
	let closing: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		motion = details?.open ? 'open' : 'closed';
		return () => clearTimeout(closing);
	});

	function finishClose() {
		clearTimeout(closing);
		closing = undefined;
		if (motion === 'closed' && details) details.open = false;
	}

	/** A press on the row: the native toggle is replaced by the kit's motion, both ways, once the page is alive. */
	async function onSummaryClick(event: MouseEvent) {
		if (!details || motion === null) return;
		event.preventDefault();
		clearTimeout(closing);
		closing = undefined;
		if (motion === 'closed') {
			details.open = true;
			// The closed row is committed before it opens, so CSS moves it from 0fr (the reveal's precedent).
			content?.getBoundingClientRect();
			motion = 'open';
			onToggle?.(true);
			return;
		}
		motion = 'closed';
		onToggle?.(false);
		await tick();
		if (!content || !isMoving(content)) finishClose();
		else closing = setTimeout(finishClose, leaveTimeout('accordion'));
	}

	function onContentTransitionEnd(event: TransitionEvent) {
		if (event.target !== content || motion !== 'closed' || (content && isMoving(content))) return;
		finishClose();
	}

	/** Opened or closed by the browser itself (find in page, another item of the group): the state follows. */
	function onNativeToggle() {
		if (!details || motion === null) return;
		if (details.open && motion === 'closed' && closing === undefined) motion = 'open';
		else if (!details.open && motion === 'open') motion = 'closed';
	}

	const chevronState = $derived(
		motion === null ? 'group-open:rotate-180' : motion === 'open' ? 'rotate-180' : ''
	);
</script>

<!-- 🔴 U-60.1 (web, common v2 §F): the kit's accordion as a `<details>` / `<summary>` — the answer is in the server's page and opens
     without JavaScript (the browser's own toggle); once the page is alive, the kit's motion of `AccordionContent` (the
     one grid row 0fr ⇔ 1fr + opacity, 220 ms `accordion`, whatever the device's setting, U-12), the chevron 180°. -->
<details
	bind:this={details}
	{id}
	{name}
	bind:open={isOpen}
	data-accordion-details={uid}
	data-slot="accordion-item"
	data-variant={variant}
	data-state={motion ?? undefined}
	data-testid={testId}
	ontoggle={onNativeToggle}
	class={cn(
		'group overflow-hidden border-b border-border/60 last:border-b-0',
		accordionItemVariants[variant],
		className
	)}
>
	<summary
		data-slot="accordion-trigger"
		onclick={onSummaryClick}
		class={cn(
			'grid min-h-touch list-none grid-cols-[1fr_auto] items-center gap-x-4 py-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset [&::-webkit-details-marker]:hidden',
			variant === 'card'
				? 'rounded-lg px-4 transition-colors duration-standard ease-standard can-hover:hover:bg-foreground/5'
				: 'can-hover:hover:underline'
		)}
	>
		{#if eyebrow}
			<span data-slot="accordion-eyebrow" class="col-start-1 text-label-md text-muted-foreground"
				>{eyebrow}</span
			>
		{/if}
		<svelte:element
			this={summaryAs}
			data-slot="accordion-summary"
			class={cn('col-start-1 text-body-lg font-medium text-foreground', summaryClass)}
		>
			{#if highlight.length > 0}{#each highlightSearch(summary, highlight) as run, index (index)}{#if run.match}<mark
							class="bg-transparent font-bold text-inherit">{run.text}</mark
						>{:else}{run.text}{/if}{/each}{:else}{summary}{/if}
		</svelte:element>
		{#if showChevron}
			<Ionicon
				name="chevron-down"
				data-slot="accordion-chevron"
				class={cn(
					'col-start-2 row-span-2 row-start-1 icon-md shrink-0 text-muted-foreground transition-transform duration-accordion ease-accordion',
					chevronState
				)}
			/>
		{/if}
	</summary>
	<div
		bind:this={content}
		data-slot="accordion-content"
		data-state={motion ?? undefined}
		ontransitionend={onContentTransitionEnd}
		class="grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-accordion ease-accordion data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0"
	>
		<div data-slot="accordion-content-cell" class="min-h-0 overflow-hidden">
			<div
				data-slot="accordion-content-inner"
				class={cn('flex flex-col pb-4', variant === 'card' && 'px-4 pt-1')}
			>
				{@render children()}
			</div>
		</div>
	</div>
</details>

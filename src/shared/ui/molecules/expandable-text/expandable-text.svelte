<script lang="ts" module>
	/** How many lines before the press: `4` (a review, a service), `6` (a long text, U-73.1 Π5). */
	export type ExpandableTextLines = 4 | 6;

	const clampClasses: Record<ExpandableTextLines, string> = {
		4: 'line-clamp-4',
		6: 'line-clamp-6'
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { HighlightText } from '$shared/ui/primitives/highlight-text';
	import { TextButton } from '$shared/ui/primitives/text-button';

	let {
		text,
		moreLabel,
		query = '',
		whole = false,
		lines = 4,
		chevron = false,
		textClass,
		buttonClass,
		buttonTextClass,
		testId,
		class: className
	}: {
		/** The user's or the CMS's words, drawn as text with their line breaks (U-65.6: never as markup). */
		text: string;
		/** «Εμφάνιση περισσότερων», shown only when the words are cut. */
		moreLabel: string;
		/** The words to mark (a search); never as markup. */
		query?: string;
		/** Never cut: a search must not hide a match after the fourth line (U-66.1 Π6). */
		whole?: boolean;
		lines?: ExpandableTextLines;
		/** «›» after «Διαβάστε περισσότερα». */
		chevron?: boolean;
		textClass?: string;
		buttonClass?: string;
		/** The press's words: a text role only (`TextButton`'s `textClass`). */
		buttonTextClass?: string;
		testId?: string;
		class?: string;
	} = $props();

	let node = $state<HTMLElement | null>(null);
	let clipped = $state(false);
	let opened = $state(false);
	let height = $state<number | null>(null);
	const cut = $derived(!opened && !whole);

	// Measured again when its box changes (a width, a zoom), the words do, or a font arrives.
	$effect(() => {
		const element = node;
		void text;
		if (!element || !cut) {
			clipped = false;
			return;
		}
		const measure = () => {
			clipped = element.scrollHeight > element.clientHeight + 1;
		};
		measure();
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		observer?.observe(element);
		const fonts = 'fonts' in document ? document.fonts : undefined;
		fonts?.addEventListener('loadingdone', measure);
		return () => {
			observer?.disconnect();
			fonts?.removeEventListener('loadingdone', measure);
		};
	});

	/** It opens in its place (U-66.1 Π7, 0,3 s): the JS only measures, the height moves by CSS (U-12). */
	async function open() {
		const from = node?.clientHeight ?? 0;
		height = from;
		opened = true;
		await tick();
		height = node?.scrollHeight ?? null;
	}
</script>

<!-- U-66.1 Π7 / U-68.1 (the review, the doctor's reply, the office's texts): four lines and «Εμφάνιση περισσότερων». -->
<div data-slot="expandable-text" class={className}>
	<p
		bind:this={node}
		data-testid={testId}
		data-cut={cut || undefined}
		style:--expandable-h={height === null ? undefined : `${height}px`}
		ontransitionend={() => (height = null)}
		class={cn(
			'max-h-expandable wrap-anywhere whitespace-pre-line text-foreground transition-[max-height] duration-sheet ease-standard',
			height !== null && 'overflow-hidden',
			cut && clampClasses[lines],
			textClass
		)}
	>
		{#if query}<HighlightText
				{text}
				{query}
				eachWord
				highlightClass="rounded-xs bg-rating/14 font-bold"
			/>{:else}{text}{/if}
	</p>
	{#if clipped}
		<TextButton
			label={moreLabel}
			underline
			{chevron}
			textClass={buttonTextClass}
			onclick={() => void open()}
			data-testid={testId ? `${testId}-more` : undefined}
			class={cn('-my-2', buttonClass)}
		/>
	{/if}
</div>

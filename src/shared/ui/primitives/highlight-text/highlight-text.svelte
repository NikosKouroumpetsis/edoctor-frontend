<script lang="ts" module>
	import { foldSearchText } from '$shared/lib/text';

	/** How many lines the words keep before «…» (the application's `numberOfLines`). */
	export type HighlightTextLines = 1 | 2 | 3;
	export type HighlightSegment = { highlighted: boolean; text: string };

	const lineClasses: Record<HighlightTextLines, string> = {
		1: 'line-clamp-1',
		2: 'line-clamp-2',
		3: 'line-clamp-3'
	};

	/**
	 * The runs of `text`, each marked when it matches the folded `query` (case and Greek-accent insensitive, the
	 * application's `buildHighlightSegments`). The label is folded one character at a time with a folded ⇒ original
	 * index map, so an accented letter never shifts a slice; the ORIGINAL text is sliced, its accents kept. An empty
	 * query, or one absent from the visible words (a filter may match hidden keywords), gives one plain run.
	 */
	export function buildHighlightSegments(text: string, query: string): HighlightSegment[] {
		const plain: HighlightSegment[] = [{ highlighted: false, text }];
		const needle = foldSearchText(query.trim());
		if (!needle || !text) return plain;

		let folded = '';
		const originalIndexOf: number[] = [];
		for (let index = 0; index < text.length; index += 1) {
			const foldedChar = foldSearchText(text[index]);
			for (let offset = 0; offset < foldedChar.length; offset += 1) originalIndexOf.push(index);
			folded += foldedChar;
		}

		const highlighted = new Array<boolean>(text.length).fill(false);
		let matched = false;
		let from = 0;
		for (;;) {
			const at = folded.indexOf(needle, from);
			if (at === -1) break;
			matched = true;
			for (let position = at; position < at + needle.length; position += 1)
				highlighted[originalIndexOf[position]] = true;
			from = at + needle.length;
		}
		if (!matched) return plain;

		const segments: HighlightSegment[] = [];
		let cursor = 0;
		while (cursor < text.length) {
			const flag = highlighted[cursor];
			let end = cursor;
			while (end < text.length && highlighted[end] === flag) end += 1;
			segments.push({ highlighted: flag, text: text.slice(cursor, end) });
			cursor = end;
		}
		return segments;
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		text,
		query,
		highlightClass = 'font-bold',
		lines,
		testId,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		/** The whole label, its accents and case kept on screen. */
		text: string;
		/** What the reader typed; folded before matching. */
		query: string;
		/** The matched runs' weight or style (default `font-bold`). */
		highlightClass?: string;
		lines?: HighlightTextLines;
		testId?: string;
	} = $props();

	const segments = $derived(buildHighlightSegments(text, query));
</script>

<!-- The application's `HighlightText`: one run of words, the matched part in its own weight; the words read once. -->
<span
	data-slot="highlight-text"
	data-testid={testId}
	class={cn(lines && lineClasses[lines], className)}
	{...restProps}
	>{#each segments as segment, index (index)}{#if segment.highlighted}<span
				data-slot="highlight-text-match"
				class={highlightClass}>{segment.text}</span
			>{:else}{segment.text}{/if}{/each}</span
>

<script lang="ts" module>
	import { foldSearchText } from '$shared/lib/text';

	/** How many lines the words keep before «…» (the application's `numberOfLines`). */
	export type HighlightTextLines = 1 | 2 | 3;
	export type HighlightSegment = { highlighted: boolean; text: string };
	/**
	 * `anywhere` (default) bolds every place the query sits; `word-start` only where a word starts with it (Airbnb's
	 * search rows, U-21: what was typed, at the start of a word).
	 */
	export type HighlightTextMatch = 'anywhere' | 'word-start';

	// A letter or a digit of any alphabet: what continues a word.
	const WORD_CHARACTER = /[\p{L}\p{N}]/u;

	const lineClasses: Record<HighlightTextLines, string> = {
		1: 'line-clamp-1',
		2: 'line-clamp-2',
		3: 'line-clamp-3'
	};

	/**
	 * The runs of `text`, each marked when it matches the folded `query` (case and Greek-accent insensitive, the
	 * application's `buildHighlightSegments`). The label is folded one character at a time with a folded ⇒ original
	 * index map, so an accented letter never shifts a slice; the ORIGINAL text is sliced, its accents kept. An empty
	 * query, or one absent from the visible words (a filter may match hidden keywords), gives one plain run. With
	 * `word-start` a place counts only where no letter or digit stands before it.
	 */
	export function buildHighlightSegments(
		text: string,
		query: string,
		match: HighlightTextMatch = 'anywhere'
	): HighlightSegment[] {
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
			if (match === 'word-start' && at > 0 && WORD_CHARACTER.test(folded[at - 1])) {
				from = at + 1;
				continue;
			}
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
		match = 'anywhere',
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
		/** Where the query counts: anywhere (default) or only at the start of a word. */
		match?: HighlightTextMatch;
		lines?: HighlightTextLines;
		testId?: string;
	} = $props();

	const segments = $derived(buildHighlightSegments(text, query, match));
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
